import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Badge,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import "./Profile.css";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    skillLevel: "",
    bio: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        skillLevel: user.skillLevel || "",
        bio: user.bio || "",
        location: user.location || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.put("/api/users/profile", formData);
      updateUser(response.data.user);
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
      const message = error.response?.data?.message || "Lỗi khi cập nhật hồ sơ";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getSkillLevelText = (level) => {
    const levels = {
      beginner: "Mới bắt đầu",
      intermediate: "Trung bình",
      advanced: "Nâng cao",
      professional: "Chuyên nghiệp",
    };
    return levels[level] || level;
  };

  const getRoleText = (role) => {
    const roles = {
      player: "Người chơi",
      owner: "Chủ sân",
      admin: "Quản trị viên",
    };
    return roles[role] || role;
  };

  const getRoleBadge = (role) => {
    const config = {
      player: { bg: "primary", icon: "fa-user" },
      owner: { bg: "warning", icon: "fa-building" },
      admin: { bg: "danger", icon: "fa-crown" },
    };
    const roleConfig = config[role] || config.player;

    return (
      <Badge bg={roleConfig.bg} className="role-badge-large">
        <i className={`fas ${roleConfig.icon} me-2`}></i>
        {getRoleText(role)}
      </Badge>
    );
  };

  const getSkillLevelBadge = (level) => {
    const config = {
      beginner: { bg: "success", icon: "fa-seedling" },
      intermediate: { bg: "info", icon: "fa-star-half-alt" },
      advanced: { bg: "warning", icon: "fa-star" },
      professional: { bg: "danger", icon: "fa-trophy" },
    };
    const skillConfig = config[level] || config.beginner;

    return (
      <Badge bg={skillConfig.bg} className="skill-badge">
        <i className={`fas ${skillConfig.icon} me-2`}></i>
        {getSkillLevelText(level)}
      </Badge>
    );
  };

  return (
    <div className="profile-page">
      <Container className="py-5">
        <Row>
          <Col lg={4}>
            {/* Profile Summary Card */}
            <Card className="profile-summary-card mb-4">
              <Card.Body className="text-center">
                <div className="profile-avatar">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="avatar-img"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                  <div className="avatar-status-badge">
                    <i className="fas fa-check-circle text-success"></i>
                  </div>
                </div>

                <h4 className="profile-name mt-3">{user?.name}</h4>
                <p className="profile-email text-muted">{user?.email}</p>

                <div className="profile-badges">
                  {getRoleBadge(user?.role)}
                  {user?.role === "player" && user?.skillLevel && (
                    <div className="mt-2">
                      {getSkillLevelBadge(user.skillLevel)}
                    </div>
                  )}
                </div>

                {user?.role === "owner" && (
                  <div className="mt-3">
                    <Badge
                      bg={user?.isApproved ? "success" : "warning"}
                      className="approval-badge"
                    >
                      <i
                        className={`fas ${
                          user?.isApproved ? "fa-check-circle" : "fa-clock"
                        } me-2`}
                      ></i>
                      {user?.isApproved ? "Đã được duyệt" : "Chờ duyệt"}
                    </Badge>
                  </div>
                )}

                <div className="profile-stats mt-4">
                  <div className="stat-item">
                    <div className="stat-number">
                      {user?.walletBalance?.toLocaleString("vi-VN") || 0}đ
                    </div>
                    <div className="stat-label">Số dư ví</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            {/* Profile Form Card */}
            <Card className="profile-form-card">
              <Card.Header className="profile-form-header">
                <h4 className="mb-0">
                  <i className="fas fa-edit me-2"></i>
                  Chỉnh sửa hồ sơ
                </h4>
              </Card.Header>

              <Card.Body className="profile-form-body">
                {error && (
                  <Alert variant="danger" className="profile-alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="profile-form-group">
                        <Form.Label className="profile-form-label">
                          <i className="fas fa-user me-2"></i>
                          Họ và tên
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="profile-form-control"
                          placeholder="Nhập họ và tên"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="profile-form-group">
                        <Form.Label className="profile-form-label">
                          <i className="fas fa-phone me-2"></i>
                          Số điện thoại
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="profile-form-control"
                          placeholder="Nhập số điện thoại"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="profile-form-group">
                        <Form.Label className="profile-form-label">
                          <i className="fas fa-envelope me-2"></i>
                          Email
                        </Form.Label>
                        <Form.Control
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="profile-form-control profile-form-disabled"
                        />
                        <Form.Text className="profile-form-help">
                          <i className="fas fa-lock me-1"></i>
                          Email không thể thay đổi
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="profile-form-group">
                        <Form.Label className="profile-form-label">
                          <i className="fas fa-user-tag me-2"></i>
                          Vai trò
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={getRoleText(user?.role)}
                          disabled
                          className="profile-form-control profile-form-disabled"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {user?.role === "player" && (
                    <Row>
                      <Col md={6}>
                        <Form.Group className="profile-form-group">
                          <Form.Label className="profile-form-label">
                            <i className="fas fa-star me-2"></i>
                            Trình độ
                          </Form.Label>
                          <Form.Select
                            name="skillLevel"
                            value={formData.skillLevel}
                            onChange={handleChange}
                            className="profile-form-control"
                          >
                            <option value="">Chọn trình độ</option>
                            <option value="beginner">Mới bắt đầu</option>
                            <option value="intermediate">Trung bình</option>
                            <option value="advanced">Nâng cao</option>
                            <option value="professional">Chuyên nghiệp</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="profile-form-group">
                          <Form.Label className="profile-form-label">
                            <i className="fas fa-map-marker-alt me-2"></i>
                            Địa điểm
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Thành phố/Quận/Huyện"
                            className="profile-form-control"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  <Form.Group className="profile-form-group">
                    <Form.Label className="profile-form-label">
                      <i className="fas fa-comment-alt me-2"></i>
                      Giới thiệu bản thân
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Viết vài dòng giới thiệu về bản thân..."
                      className="profile-form-control"
                    />
                  </Form.Group>

                  <div className="profile-form-actions">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading}
                      className="profile-submit-btn"
                    >
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></span>
                          Đang cập nhật...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Cập nhật hồ sơ
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Profile;
