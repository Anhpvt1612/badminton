import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Container, Card, Button } from "react-bootstrap";
import axios from "axios";
import "./PaymentSuccess.css";

const PaymentSuccess = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/auth/me");
        updateUser(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoading(false);
      }
    };
    fetchUser();
  }, [updateUser]);

  useEffect(() => {
    if (!loading && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate("/");
    }
  }, [countdown, loading, navigate]);

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="payment-success-page">
      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Card className="payment-success-card text-center">
          <Card.Body className="payment-success-body">
            {loading ? (
              <>
                <div className="loading-animation">
                  <div className="loading-spinner"></div>
                </div>
                <h3 className="loading-title">Đang xử lý thanh toán...</h3>
                <p className="loading-text">Vui lòng đợi trong giây lát</p>
              </>
            ) : (
              <>
                <div className="success-animation">
                  <div className="success-checkmark">
                    <div className="check-icon">
                      <span className="icon-line line-tip"></span>
                      <span className="icon-line line-long"></span>
                      <div className="icon-circle"></div>
                      <div className="icon-fix"></div>
                    </div>
                  </div>
                </div>

                <h2 className="success-title">Thanh toán thành công!</h2>
                <p className="success-message">
                  Số dư ví của bạn đã được cập nhật.
                </p>

                <div className="success-details">
                  <div className="detail-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Giao dịch đã được xác nhận
                  </div>
                  <div className="detail-item">
                    <i className="fas fa-wallet text-primary me-2"></i>
                    Số dư đã được cập nhật
                  </div>
                </div>

                <div className="countdown-section">
                  <p className="countdown-text">
                    Tự động chuyển về trang chủ sau{" "}
                    <span className="countdown-number">{countdown}</span> giây
                  </p>
                  <div className="countdown-progress">
                    <div
                      className="countdown-fill"
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="success-actions">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGoHome}
                    className="success-btn"
                  >
                    <i className="fas fa-home me-2"></i>
                    Về trang chủ ngay
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default PaymentSuccess;
