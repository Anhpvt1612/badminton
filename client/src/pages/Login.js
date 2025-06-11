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
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "./Auth.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

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

    const result = await login(formData.email, formData.password);

    if (result.success) {
      toast.success(result.message);
      navigate(from, { replace: true });
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
          <Col lg={5} md={7} sm={9}>
            <div className="auth-wrapper">
              <Card className="auth-card shadow-lg border-0">
                <Card.Body className="auth-card-body">
                  <div className="auth-header text-center">
                    <div className="auth-icon">
                      <i className="fas fa-user-circle"></i>
                    </div>
                    <h2 className="auth-title">Chào mừng trở lại!</h2>
                    <p className="auth-subtitle">Đăng nhập để tiếp tục</p>
                  </div>

                  {error && (
                    <Alert variant="danger" className="auth-alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit} className="auth-form">
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

                    <div className="auth-options">
                      <Form.Check
                        type="checkbox"
                        id="remember-me"
                        label="Ghi nhớ đăng nhập"
                        className="auth-checkbox"
                      />
                      <Link to="/forgot-password" className="auth-link">
                        Quên mật khẩu?
                      </Link>
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
                          Đang đăng nhập...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt me-2"></i>
                          Đăng nhập
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="auth-footer text-center">
                    <p className="auth-switch-text">
                      Chưa có tài khoản?
                      <Link to="/register" className="auth-switch-link">
                        Đăng ký ngay
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

export default Login;
