import React, { useState, useEffect, useCallback } from "react";
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
  InputGroup,
  Pagination,
  Dropdown,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import "./Posts.css";

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
    playDate: "",
    startTime: "",
    endTime: "",
    maxPlayers: 2,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const { user, isAuthenticated } = useAuth();

  const postsPerPage = 9;

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      queryParams.append("sort", sortBy);

      const response = await axios.get(`/api/posts?${queryParams}`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Lỗi khi tải danh sách bài đăng");
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    try {
      // Validation phía client
      const playDate = new Date(formData.playDate);
      const now = new Date();

      // Tạo datetime cho validation
      const [startHours, startMinutes] = formData.startTime
        .split(":")
        .map(Number);
      const [endHours, endMinutes] = formData.endTime.split(":").map(Number);

      const playDateTime = new Date(playDate);
      playDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(playDate);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Validate thời gian
      if (playDateTime <= now) {
        setError("Không thể đăng bài cho thời gian trong quá khứ");
        return;
      }

      if (endDateTime <= playDateTime) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }

      // Validate khoảng cách thời gian tối thiểu (ví dụ: ít nhất 1 tiếng)
      const durationHours = (endDateTime - playDateTime) / (1000 * 60 * 60);
      if (durationHours < 1) {
        setError("Thời gian chơi phải ít nhất 1 tiếng");
        return;
      }

      const response = await axios.post("/api/posts", formData);
      setPosts([response.data, ...posts]);
      setShowCreateModal(false);
      setFormData({
        title: "",
        content: "",
        type: "find_player",
        skillLevel: "any",
        location: "",
        playDate: "",
        startTime: "",
        endTime: "",
        maxPlayers: 2,
      });
      toast.success("Tạo bài đăng thành công!");
    } catch (error) {
      setError(error.response?.data?.message || "Lỗi khi tạo bài đăng");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleJoinPost = async (postId) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để tham gia");
      return;
    }

    try {
      const response = await axios.post(`/api/posts/${postId}/join`, {
        message: "Tôi muốn tham gia chơi cầu lông với bạn!",
      });

      setPosts(
        posts.map((post) => (post._id === postId ? response.data.post : post))
      );

      toast.success(response.data.message);
    } catch (error) {
      console.error("Error joining post:", error);
      const errorMessage =
        error.response?.data?.message || "Lỗi khi tham gia bài đăng";
      toast.error(errorMessage);
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

  const formatPlayTime = (post) => {
    if (post.playDate && post.startTime && post.endTime) {
      const playDate = new Date(post.playDate);
      const dateStr = playDate.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return `${dateStr}, ${post.startTime}-${post.endTime}`;
    }
    return post.preferredTime || "Chưa xác định";
  };

  const getTimeStatus = (post) => {
    if (!post.playDate || !post.startTime || !post.endTime) {
      return "active";
    }

    const now = new Date();
    const [startHours, startMinutes] = post.startTime.split(":").map(Number);
    const [endHours, endMinutes] = post.endTime.split(":").map(Number);

    const playDateTime = new Date(post.playDate);
    playDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(post.playDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    if (now >= endDateTime) {
      return "finished";
    } else if (now >= playDateTime) {
      return "playing";
    }
    return "upcoming";
  };

  const getStatusBadge = (post) => {
    const timeStatus = getTimeStatus(post);

    if (timeStatus === "finished") {
      return (
        <Badge bg="secondary" className="status-badge">
          ✓ Đã kết thúc
        </Badge>
      );
    }

    if (timeStatus === "playing") {
      return (
        <Badge bg="warning" className="status-badge">
          🏸 Đang chơi
        </Badge>
      );
    }

    if (post.status === "completed") {
      return (
        <Badge bg="success" className="status-badge">
          ✓ Đã đủ người
        </Badge>
      );
    }

    if (new Date(post.expiresAt) < new Date()) {
      return (
        <Badge bg="danger" className="status-badge">
          ⏰ Hết hạn đăng ký
        </Badge>
      );
    }

    return (
      <Badge bg="primary" className="status-badge">
        🔍 Đang tìm người
      </Badge>
    );
  };

  const canJoinPost = (post) => {
    if (!isAuthenticated) return false;
    if (post.author._id === user._id) return false;
    if (post.status !== "active") return false;

    const timeStatus = getTimeStatus(post);
    if (timeStatus !== "upcoming") return false;

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
    return "Tham gia ngay";
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

  // Filter and pagination
  const filteredPosts = posts.filter((post) => {
    if (filters.search) {
      return (
        post.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        post.content.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    return true;
  });

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  if (loading) {
    return (
      <Container className="posts-page py-5">
        <div className="loading-container">
          <Spinner animation="border" variant="primary" size="lg" />
          <h4 className="mt-3">Đang tải cộng đồng...</h4>
        </div>
      </Container>
    );
  }

  return (
    <Container className="posts-page py-5">
      {/* Hero Header */}
      <div className="page-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="hero-text">
            <h1 className="hero-title">Cộng đồng cầu lông</h1>
            <p className="hero-subtitle">
              Kết nối với những người chơi cầu lông trong khu vực của bạn
            </p>
          </div>
          {isAuthenticated && (
            <Button
              variant="primary"
              size="lg"
              className="hero-cta"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus me-2"></i>
              Tạo bài đăng
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <Row className="stats-row mb-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="stat-number">{posts.length}</h3>
              <p className="stat-label">Tổng bài đăng</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3 className="stat-number">
                {posts.filter((p) => p.type === "find_player").length}
              </h3>
              <p className="stat-label">Tìm người chơi</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 className="stat-number">
                {posts.filter((p) => p.status === "completed").length}
              </h3>
              <p className="stat-label">Đã hoàn thành</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <h3 className="stat-number">
                {posts.filter((p) => p.type === "court_promotion").length}
              </h3>
              <p className="stat-label">Khuyến mãi</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="filters-card mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={2}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <i className="fas fa-filter me-2"></i>Loại bài đăng
                </Form.Label>
                <Form.Select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="find_player">Tìm người chơi</option>
                  <option value="court_promotion">Khuyến mãi sân</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <i className="fas fa-trophy me-2"></i>Trình độ
                </Form.Label>
                <Form.Select
                  value={filters.skillLevel}
                  onChange={(e) =>
                    setFilters({ ...filters, skillLevel: e.target.value })
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="beginner">Mới bắt đầu</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                  <option value="professional">Chuyên nghiệp</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={2}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <i className="fas fa-map-marker-alt me-2"></i>Khu vực
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nhập khu vực..."
                  value={filters.location}
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                  className="filter-input"
                />
              </Form.Group>
            </Col>
            <Col lg={3}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <i className="fas fa-search me-2"></i>Tìm kiếm
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm bài đăng..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="search-input"
                  />
                  <InputGroup.Text className="search-icon">
                    <i className="fas fa-search"></i>
                  </InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col lg={2}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <i className="fas fa-sort me-2"></i>Sắp xếp
                </Form.Label>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="popular">Phổ biến</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col lg={1}>
              <Button
                variant="outline-primary"
                className="refresh-btn"
                onClick={fetchPosts}
                title="Làm mới"
              >
                <i className="fas fa-sync-alt"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          className="error-alert"
        >
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Posts Grid */}
      {currentPosts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-search"></i>
          </div>
          <h3>Không có bài đăng nào</h3>
          <p>
            {filters.search ||
            filters.type ||
            filters.skillLevel ||
            filters.location
              ? "Hãy thử thay đổi bộ lọc để tìm thấy kết quả phù hợp hơn"
              : "Hãy tạo bài đăng đầu tiên để bắt đầu kết nối với cộng đồng!"}
          </p>
          {isAuthenticated && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="empty-cta"
            >
              <i className="fas fa-plus me-2"></i>
              Tạo bài đăng đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <Row>
          {currentPosts.map((post) => (
            <Col lg={4} md={6} key={post._id} className="mb-4">
              <Card className="post-card h-100">
                <Card.Header className="post-header">
                  <div className="post-type">
                    <Badge
                      bg={post.type === "find_player" ? "primary" : "success"}
                      className="type-badge"
                    >
                      <i
                        className={`fas ${
                          post.type === "find_player"
                            ? "fa-search"
                            : "fa-percent"
                        } me-1`}
                      ></i>
                      {post.type === "find_player"
                        ? "Tìm người chơi"
                        : "Khuyến mãi sân"}
                    </Badge>
                  </div>
                  {getStatusBadge(post)}
                </Card.Header>

                <Card.Body className="post-body">
                  <h5 className="post-title">{post.title}</h5>
                  <p className="post-content">
                    {post.content.length > 120
                      ? `${post.content.substring(0, 120)}...`
                      : post.content}
                  </p>

                  <div className="post-meta">
                    <div className="meta-item">
                      <i className="fas fa-user"></i>
                      <span>
                        <strong>{post.author?.name || "Ẩn danh"}</strong>
                      </span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{post.location}</span>
                    </div>
                    {post.skillLevel && (
                      <div className="meta-item">
                        <i className="fas fa-trophy"></i>
                        <span>{getSkillLevelText(post.skillLevel)}</span>
                      </div>
                    )}
                    {post.preferredTime && (
                      <div className="meta-item">
                        <i className="fas fa-clock"></i>
                        <span>{formatPlayTime(post)}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <i className="fas fa-users"></i>
                      <span>
                        <strong>
                          {post.approvedPlayers?.length || 1}/{post.maxPlayers}
                        </strong>{" "}
                        người
                      </span>
                    </div>
                  </div>
                </Card.Body>

                <Card.Footer className="post-footer">
                  <div className="footer-info">
                    <small className="post-date">
                      <i className="fas fa-calendar me-1"></i>
                      {formatDate(post.createdAt)}
                    </small>
                  </div>
                  <Button
                    variant={
                      canJoinPost(post) ? "primary" : "outline-secondary"
                    }
                    size="sm"
                    className="join-btn"
                    disabled={!canJoinPost(post)}
                    onClick={() => handleJoinPost(post._id)}
                  >
                    <i
                      className={`fas ${
                        canJoinPost(post) ? "fa-hand-holding-heart" : "fa-check"
                      } me-1`}
                    ></i>
                    {getJoinButtonText(post)}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <Pagination>
            <Pagination.First
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
        centered
        className="create-post-modal"
      >
        <Modal.Header closeButton className="modal-header-custom">
          <Modal.Title>
            <i className="fas fa-plus me-2"></i>
            Tạo bài đăng mới
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreatePost}>
          <Modal.Body className="modal-body-custom">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-heading me-2"></i>Tiêu đề *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="VD: Tìm đối thủ chơi cầu lông tối nay"
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-tag me-2"></i>Loại bài đăng *
                  </Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    required
                    className="form-select-custom"
                  >
                    <option value="find_player">Tìm người chơi</option>
                    <option value="court_promotion">Khuyến mãi sân</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                <i className="fas fa-align-left me-2"></i>Nội dung *
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                required
                placeholder="Mô tả chi tiết về yêu cầu của bạn..."
                className="form-textarea-custom"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-map-marker-alt me-2"></i>Khu vực *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    required
                    placeholder="VD: Quận 1, TP.HCM"
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-clock me-2"></i>Thời gian mong muốn
                  </Form.Label>
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
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-calendar me-2"></i>Ngày chơi *
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.playDate}
                    onChange={(e) =>
                      setFormData({ ...formData, playDate: e.target.value })
                    }
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-clock me-2"></i>Giờ bắt đầu *
                  </Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-clock me-2"></i>Giờ kết thúc *
                  </Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    required
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-trophy me-2"></i>Trình độ
                  </Form.Label>
                  <Form.Select
                    value={formData.skillLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, skillLevel: e.target.value })
                    }
                    className="form-select-custom"
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
                  <Form.Label className="form-label-custom">
                    <i className="fas fa-users me-2"></i>Số người tối đa
                  </Form.Label>
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
                    className="form-input-custom"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="modal-footer-custom">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary-custom"
            >
              <i className="fas fa-times me-1"></i>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitLoading}
              className="btn-primary-custom"
            >
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
