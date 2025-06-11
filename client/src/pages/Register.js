import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "./Auth.css";

const Register = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") || "player";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: defaultRole,
    skillLevel: "beginner",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

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

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    if (result.success) {
      toast.success(result.message);
      navigate("/");
    } else {
      setError(result.message);
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <Container className="auth-container">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col lg={8} md={10}>
            <div className="auth-wrapper">
              <Card className="auth-card shadow-lg border-0">
                <Card.Body className="auth-card-body">
                  <div className="auth-header text-center">
                    <div className="auth-icon">
                      <i className="fas fa-user-plus"></i>
                    </div>
                    <h2 className="auth-title">Tạo tài khoản mới</h2>
                    <p className="auth-subtitle">Tham gia cộng đồng cầu lông</p>
                  </div>

                  {error && (
                    <Alert variant="danger" className="auth-alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit} className="auth-form">
                    <Row>
                      <Col lg={6}>
                        <Form.Group className="auth-form-group">
                          <Form.Label className="auth-label">
                            <i className="fas fa-user me-2"></i>
                            Họ và tên
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Nhập họ và tên"
                            className="auth-input"
                          />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="auth-form-group">
                          <Form.Label className="auth-label">
                            <i className="fas fa-phone me-2"></i>
                            Số điện thoại
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="Nhập số điện thoại"
                            className="auth-input"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="auth-form-group">
                      <Form.Label className="auth-label">
                        <i className="fas fa-envelope me-2"></i>
                        Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="Nhập địa chỉ email"
                        className="auth-input"
                      />
                    </Form.Group>

                    <Row>
                      <Col lg={6}>
                        <Form.Group className="auth-form-group">
                          <Form.Label className="auth-label">
                            <i className="fas fa-lock me-2"></i>
                            Mật khẩu
                          </Form.Label>
                          <div className="password-input-wrapper">
                            <Form.Control
                              type={showPassword ? "text" : "password"}
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              required
                              placeholder="Nhập mật khẩu"
                              className="auth-input password-input"
                            />
                            <Button
                              variant="link"
                              className="password-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                              type="button"
                            >
                              <i
                                className={`fas ${
                                  showPassword ? "fa-eye-slash" : "fa-eye"
                                }`}
                              ></i>
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="auth-form-group">
                          <Form.Label className="auth-label">
                            <i className="fas fa-lock me-2"></i>
                            Xác nhận mật khẩu
                          </Form.Label>
                          <div className="password-input-wrapper">
                            <Form.Control
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              required
                              placeholder="Nhập lại mật khẩu"
                              className="auth-input password-input"
                            />
                            <Button
                              variant="link"
                              className="password-toggle"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              type="button"
                            >
                              <i
                                className={`fas ${
                                  showConfirmPassword
                                    ? "fa-eye-slash"
                                    : "fa-eye"
                                }`}
                              ></i>
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col lg={6}>
                        <Form.Group className="auth-form-group">
                          <Form.Label className="auth-label">
                            <i className="fas fa-user-tag me-2"></i>
                            Vai trò
                          </Form.Label>
                          <Form.Select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="auth-input"
                          >
                            <option value="player">Người chơi</option>
                            <option value="owner">Chủ sân</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      {formData.role === "player" && (
                        <Col lg={6}>
                          <Form.Group className="auth-form-group">
                            <Form.Label className="auth-label">
                              <i className="fas fa-star me-2"></i>
                              Trình độ
                            </Form.Label>
                            <Form.Select
                              name="skillLevel"
                              value={formData.skillLevel}
                              onChange={handleChange}
                              className="auth-input"
                            >
                              <option value="beginner">Mới bắt đầu</option>
                              <option value="intermediate">Trung bình</option>
                              <option value="advanced">Nâng cao</option>
                              <option value="professional">
                                Chuyên nghiệp
                              </option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      )}
                    </Row>

                    <div className="auth-options">
                      <Form.Check
                        type="checkbox"
                        id="terms"
                        label={
                          <span>
                            Tôi đồng ý với{" "}
                            <Link to="/terms" className="auth-link">
                              Điều khoản sử dụng
                            </Link>{" "}
                            và{" "}
                            <Link to="/privacy" className="auth-link">
                              Chính sách bảo mật
                            </Link>
                          </span>
                        }
                        required
                        className="auth-checkbox"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="auth-submit-btn w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></span>
                          Đang tạo tài khoản...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus me-2"></i>
                          Tạo tài khoản
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="auth-footer text-center">
                    <p className="auth-switch-text">
                      Đã có tài khoản?
                      <Link to="/login" className="auth-switch-link">
                        Đăng nhập ngay
                      </Link>
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;
