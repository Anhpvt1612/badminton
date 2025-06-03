import React, { useState, useEffect, useCallback } from "react"; // SỬA: THÊM React import
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Modal,
  Alert,
  Badge,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    skillLevel: "",
    location: "",
    search: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "find_player",
    skillLevel: "any",
    location: "",
    preferredTime: "",
    maxPlayers: 2,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, isAuthenticated } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(`/api/posts?${queryParams}`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Lỗi khi tải danh sách bài đăng");
    } finally {
      setLoading(false);
    }
  }, [filters]); // THÊM dependency

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]); // SỬA: sử dụng fetchPosts

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/posts", formData);
      setPosts([response.data, ...posts]);
      setShowCreateModal(false);
      setFormData({
        title: "",
        content: "",
        type: "find_player",
        skillLevel: "any",
        location: "",
        preferredTime: "",
        maxPlayers: 2,
      });
    } catch (error) {
      setError(error.response?.data?.message || "Lỗi khi tạo bài đăng");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleJoinPost = async (postId) => {
    if (!isAuthenticated) {
      setError("Vui lòng đăng nhập để tham gia");
      return;
    }

    try {
      const response = await axios.post(`/api/posts/${postId}/join`, {
        message: "Tôi muốn tham gia chơi cầu lông với bạn!",
      });

      // Cập nhật post trong danh sách
      setPosts(
        posts.map((post) => (post._id === postId ? response.data.post : post))
      );

      alert(response.data.message);
    } catch (error) {
      console.error("Error joining post:", error);
      const errorMessage =
        error.response?.data?.message || "Lỗi khi tham gia bài đăng";
      alert(errorMessage);
    }
  };

  const getSkillLevelText = (level) => {
    const levels = {
      beginner: "Mới bắt đầu",
      intermediate: "Trung bình",
      advanced: "Nâng cao",
      professional: "Chuyên nghiệp",
      any: "Tất cả trình độ",
    };
    return levels[level] || level;
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

  const canJoinPost = (post) => {
    if (!isAuthenticated) return false;
    if (post.author._id === user._id) return false;
    if (post.status !== "active") return false;
    if (new Date(post.expiresAt) < new Date()) return false;
    if (post.approvedPlayers?.some((player) => player._id === user._id))
      return false;
    if (post.pendingRequests?.some((request) => request.user._id === user._id))
      return false;
    if (post.approvedPlayers?.length >= post.maxPlayers) return false;
    return true;
  };

  const getJoinButtonText = (post) => {
    if (!isAuthenticated) return "Đăng nhập để tham gia";
    if (post.author._id === user._id) return "Bài đăng của bạn";
    if (post.approvedPlayers?.some((player) => player._id === user._id))
      return "Đã tham gia";
    if (post.pendingRequests?.some((request) => request.user._id === user._id))
      return "Đã gửi yêu cầu";
    if (post.approvedPlayers?.length >= post.maxPlayers) return "Đã đủ người";
    if (post.status !== "active") return "Không còn hoạt động";
    if (new Date(post.expiresAt) < new Date()) return "Đã hết hạn";
    return "Tham gia";
  };

  // SỬA: Format time properly
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
              <i className="fas fa-search me-2"></i>
              Tìm đối thủ
            </h2>
            {isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus me-2"></i>
                Tạo bài đăng
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Loại bài đăng</Form.Label>
                    <Form.Select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters({ ...filters, type: e.target.value })
                      }
                    >
                      <option value="">Tất cả</option>
                      <option value="find_player">Tìm người chơi</option>
                      <option value="court_promotion">Khuyến mãi sân</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Trình độ</Form.Label>
                    <Form.Select
                      value={filters.skillLevel}
                      onChange={(e) =>
                        setFilters({ ...filters, skillLevel: e.target.value })
                      }
                    >
                      <option value="">Tất cả</option>
                      <option value="beginner">Mới bắt đầu</option>
                      <option value="intermediate">Trung bình</option>
                      <option value="advanced">Nâng cao</option>
                      <option value="professional">Chuyên nghiệp</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Khu vực</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Nhập khu vực..."
                      value={filters.location}
                      onChange={(e) =>
                        setFilters({ ...filters, location: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Tìm kiếm</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      {/* Posts List */}
      <Row>
        {posts.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <i className="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Không có bài đăng nào</h5>
                <p className="text-muted">
                  Hãy thử thay đổi bộ lọc hoặc tạo bài đăng mới
                </p>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          posts.map((post) => (
            <Col md={6} lg={4} key={post._id} className="mb-4">
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
                    {post.content.length > 100
                      ? `${post.content.substring(0, 100)}...`
                      : post.content}
                  </Card.Text>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <i className="fas fa-user me-1"></i>
                      <strong>{post.author?.name || "Ẩn danh"}</strong>
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {post.location}
                    </small>
                    {post.skillLevel && (
                      <small className="text-muted d-block">
                        <i className="fas fa-trophy me-1"></i>
                        {getSkillLevelText(post.skillLevel)}
                      </small>
                    )}
                    {post.preferredTime && (
                      <small className="text-muted d-block">
                        <i className="fas fa-clock me-1"></i>
                        {post.preferredTime}
                      </small>
                    )}
                    <small className="text-muted d-block">
                      <i className="fas fa-users me-1"></i>
                      {post.approvedPlayers?.length || 1}/{post.maxPlayers}{" "}
                      người
                    </small>
                    <small className="text-muted d-block">
                      <i className="fas fa-calendar me-1"></i>
                      {formatDate(post.createdAt)}{" "}
                      {/* SỬA: Sử dụng formatDate */}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button
                    variant={canJoinPost(post) ? "primary" : "secondary"}
                    size="sm"
                    className="w-100"
                    disabled={!canJoinPost(post)}
                    onClick={() => handleJoinPost(post._id)}
                  >
                    <i className="fas fa-hand-holding-heart me-1"></i>
                    {getJoinButtonText(post)}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Create Post Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus me-2"></i>
            Tạo bài đăng mới
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreatePost}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tiêu đề *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="VD: Tìm đối thủ chơi cầu lông tối nay"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Loại bài đăng *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    required
                  >
                    <option value="find_player">Tìm người chơi</option>
                    <option value="court_promotion">Khuyến mãi sân</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Nội dung *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                required
                placeholder="Mô tả chi tiết về yêu cầu của bạn..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Khu vực *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    required
                    placeholder="VD: Quận 1, TP.HCM"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Thời gian mong muốn</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.preferredTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredTime: e.target.value,
                      })
                    }
                    placeholder="VD: Tối thứ 7, 19:00-21:00"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trình độ</Form.Label>
                  <Form.Select
                    value={formData.skillLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, skillLevel: e.target.value })
                    }
                  >
                    <option value="any">Tất cả trình độ</option>
                    <option value="beginner">Mới bắt đầu</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                    <option value="professional">Chuyên nghiệp</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Số người tối đa</Form.Label>
                  <Form.Control
                    type="number"
                    min="2"
                    max="10"
                    value={formData.maxPlayers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxPlayers: parseInt(e.target.value),
                      })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              <i className="fas fa-times me-1"></i>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={submitLoading}>
              {submitLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <i className="fas fa-plus me-1"></i>
                  Tạo bài đăng
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Posts;
