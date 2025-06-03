import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Alert,
  Modal,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePostId, setDeletePostId] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchMyPosts();
  }, [isAuthenticated, navigate]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/posts/my-posts");
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching my posts:", error);
      setError("Lỗi khi tải bài đăng của bạn");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (postId, userId) => {
    try {
      setActionLoading(true);
      const response = await axios.post(
        `/api/posts/${postId}/approve/${userId}`
      );

      // Cập nhật post trong danh sách
      setPosts(
        posts.map((post) => (post._id === postId ? response.data.post : post))
      );

      setError("");
      alert(response.data.message);
    } catch (error) {
      console.error("Error approving request:", error);
      setError(error.response?.data?.message || "Lỗi khi duyệt yêu cầu");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (postId, userId) => {
    try {
      setActionLoading(true);
      const response = await axios.post(
        `/api/posts/${postId}/reject/${userId}`
      );

      // Cập nhật post trong danh sách
      setPosts(
        posts.map((post) => (post._id === postId ? response.data.post : post))
      );

      setError("");
      alert(response.data.message);
    } catch (error) {
      console.error("Error rejecting request:", error);
      setError(error.response?.data?.message || "Lỗi khi từ chối yêu cầu");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      setActionLoading(true);
      await axios.delete(`/api/posts/${deletePostId}`);

      setPosts(posts.filter((post) => post._id !== deletePostId));
      setShowDeleteModal(false);
      setDeletePostId(null);
      setError("");
      alert("Xóa bài đăng thành công");
    } catch (error) {
      console.error("Error deleting post:", error);
      setError(error.response?.data?.message || "Lỗi khi xóa bài đăng");
    } finally {
      setActionLoading(false);
    }
  };

  const goToGroupChat = (post) => {
    if (post.groupChatId) {
      navigate(`/chat/group/${post.groupChatId}`);
    } else {
      setError("Bài đăng này chưa có nhóm chat");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Không xác định";
    }
  };

  const getStatusBadge = (post) => {
    if (post.status === "completed") {
      return <Badge bg="success">Đã đủ người</Badge>;
    }
    if (new Date(post.expiresAt) < new Date()) {
      return <Badge bg="danger">Đã hết hạn</Badge>;
    }
    return <Badge bg="primary">Đang tìm người</Badge>;
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="fas fa-list-alt me-2"></i>
              Quản lý bài đăng của tôi
            </h2>
            <Button variant="primary" onClick={() => navigate("/posts")}>
              <i className="fas fa-plus me-2"></i>
              Tạo bài đăng mới
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      {posts.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="fas fa-list-alt fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Bạn chưa có bài đăng nào</h5>
            <p className="text-muted">
              Hãy tạo bài đăng đầu tiên để tìm đối thủ chơi cầu lông
            </p>
            <Button variant="primary" onClick={() => navigate("/posts")}>
              <i className="fas fa-plus me-2"></i>
              Tạo bài đăng
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {posts.map((post) => (
            <Col lg={6} key={post._id} className="mb-4">
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge
                      bg={post.type === "find_player" ? "primary" : "success"}
                    >
                      {post.type === "find_player"
                        ? "Tìm người chơi"
                        : "Khuyến mãi sân"}
                    </Badge>
                  </div>
                  {getStatusBadge(post)}
                </Card.Header>

                <Card.Body>
                  <Card.Title className="mb-2">{post.title}</Card.Title>
                  <Card.Text className="text-muted small mb-3">
                    {post.content.length > 150
                      ? `${post.content.substring(0, 150)}...`
                      : post.content}
                  </Card.Text>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {post.location}
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-users me-1"></i>
                      {post.approvedPlayers?.length || 1}/{post.maxPlayers}{" "}
                      người
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-calendar me-1"></i>
                      {formatDate(post.createdAt)}
                    </small>
                    {post.expiresAt && (
                      <small className="text-muted d-block">
                        <i className="fas fa-clock me-1"></i>
                        Hết hạn: {formatDate(post.expiresAt)}
                      </small>
                    )}
                  </div>

                  {/* DANH SÁCH NGƯỜI ĐÃ THAM GIA */}
                  {post.approvedPlayers && post.approvedPlayers.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-primary">
                        <i className="fas fa-check-circle me-1"></i>
                        Đã tham gia ({post.approvedPlayers.length})
                      </h6>
                      <div className="d-flex flex-wrap gap-1">
                        {post.approvedPlayers.map((player) => (
                          <Badge
                            key={player._id}
                            bg="success"
                            className="text-wrap"
                          >
                            {player.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DANH SÁCH YÊU CẦU CHỜ DUYỆT */}
                  {post.pendingRequests && post.pendingRequests.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-warning">
                        <i className="fas fa-hourglass-half me-1"></i>
                        Yêu cầu chờ duyệt ({post.pendingRequests.length})
                      </h6>
                      <ListGroup variant="flush" className="border rounded">
                        {post.pendingRequests.map((request) => (
                          <ListGroup.Item
                            key={request.user._id}
                            className="py-2"
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center mb-1">
                                  <strong className="me-2">
                                    {request.user.name}
                                  </strong>
                                  <small className="text-muted">
                                    {formatDate(request.requestedAt)}
                                  </small>
                                </div>
                                {request.message && (
                                  <small className="text-muted d-block">
                                    <i className="fas fa-comment me-1"></i>
                                    {request.message}
                                  </small>
                                )}
                              </div>
                              <div className="d-flex gap-1">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() =>
                                    handleApproveRequest(
                                      post._id,
                                      request.user._id
                                    )
                                  }
                                  disabled={
                                    actionLoading ||
                                    post.approvedPlayers?.length >=
                                      post.maxPlayers
                                  }
                                >
                                  <i className="fas fa-check"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() =>
                                    handleRejectRequest(
                                      post._id,
                                      request.user._id
                                    )
                                  }
                                  disabled={actionLoading}
                                >
                                  <i className="fas fa-times"></i>
                                </Button>
                              </div>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </Card.Body>

                <Card.Footer>
                  <div className="d-flex gap-2">
                    {post.type === "find_player" && post.groupChatId && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => goToGroupChat(post)}
                      >
                        <i className="fas fa-comments me-1"></i>
                        Nhóm chat
                      </Button>
                    )}
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        setDeletePostId(post._id);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="fas fa-trash me-1"></i>
                      Xóa
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
            Xác nhận xóa
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bạn có chắc chắn muốn xóa bài đăng này?</p>
          <div className="alert alert-warning">
            <small>
              <i className="fas fa-info-circle me-1"></i>
              Hành động này không thể hoàn tác. Nhóm chat liên quan cũng sẽ bị
              xóa.
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            <i className="fas fa-times me-1"></i>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={handleDeletePost}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Đang xóa...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-1"></i>
                Xóa bài đăng
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyPosts;
