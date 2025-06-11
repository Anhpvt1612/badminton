import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  InputGroup,
  Card,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CourtCard from "../components/CourtCard";
import "./Home.css"; // Thêm file CSS riêng

const Home = () => {
  const [searchLocation, setSearchLocation] = useState("");
  const [featuredCourts, setFeaturedCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCourts: 0,
    totalBookings: 0,
    totalUsers: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedCourts();
    fetchStats();
  }, []);

  const fetchFeaturedCourts = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/courts?isPosted=true&limit=6");
      setFeaturedCourts(response.data.courts || []);
    } catch (error) {
      console.error("Error fetching featured courts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/courts/stats/public");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/courts?location=${encodeURIComponent(searchLocation)}`);
  };

  return (
    <div className="home-page">
      {/* Hero Section với gradient background */}
      <section className="hero-section">
        <div className="hero-overlay">
          <Container>
            <Row className="align-items-center min-vh-100">
              <Col lg={6} className="hero-contents">
                <div className="hero-text">
                  <h1 className="hero-title">
                    Đặt sân cầu lông
                    <span className="text-gradient"> dễ dàng</span>
                  </h1>
                  <p className="hero-subtitle">
                    Tìm và đặt sân cầu lông chất lượng cao gần bạn. Kết nối với
                    cộng đồng người chơi cầu lông chuyên nghiệp.
                  </p>
                  <div className="hero-stats">
                    <div className="stat-item">
                      <span className="stat-number">{stats.totalCourts}+</span>
                      <span className="stat-label">Sân cầu lông</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {stats.totalBookings}+
                      </span>
                      <span className="stat-label">Lượt đặt sân</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{stats.totalUsers}+</span>
                      <span className="stat-label">Người dùng</span>
                    </div>
                  </div>
                </div>

                <Form onSubmit={handleSearch} className="search-form">
                  <div className="search-container">
                    <InputGroup size="lg" className="search-input-group">
                      <Form.Control
                        type="text"
                        placeholder="Nhập địa điểm bạn muốn tìm..."
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="search-input"
                      />
                      <Button
                        variant="primary"
                        type="submit"
                        className="search-btn"
                      >
                        <i className="fas fa-search me-2"></i>
                        Tìm kiếm
                      </Button>
                    </InputGroup>
                  </div>
                </Form>

                <div className="hero-actions">
                  <Button
                    variant="outline-light"
                    size="lg"
                    className="me-3 hero-btn"
                    onClick={() => navigate("/courts")}
                  >
                    <i className="fas fa-map-marker-alt me-2"></i>
                    Xem tất cả sân
                  </Button>
                  <Button
                    variant="warning"
                    size="lg"
                    className="hero-btn"
                    onClick={() => navigate("/register?role=owner")}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Đăng ký làm chủ sân
                  </Button>
                </div>
              </Col>
              <Col lg={6} className="hero-image">
                <div className="image-container">
                  <img
                    src="https://shopvnb.com/uploads/tin_tuc/vot-cau-long-qua-cung-tac-hai-gi-cach-chon-vot-cau-long-phu-hop.webp"
                    alt="Badminton Court"
                    className="img-fluid hero-img"
                  />
                  <div className="floating-card">
                    <i className="fas fa-star text-warning"></i>
                    <span>Đánh giá 4.8/5 từ khách hàng</span>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Tại sao chọn chúng tôi?</h2>
              <p className="section-subtitle">
                Những lý do khiến chúng tôi trở thành lựa chọn hàng đầu
              </p>
            </Col>
          </Row>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="feature-card">
                <Card.Body className="text-center">
                  <div className="feature-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <Card.Title className="feature-title">
                    Đặt sân 24/7
                  </Card.Title>
                  <Card.Text className="feature-text">
                    Đặt sân bất cứ lúc nào, bất cứ đâu với hệ thống đặt sân trực
                    tuyến tiện lợi và nhanh chóng.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="feature-card">
                <Card.Body className="text-center">
                  <div className="feature-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <Card.Title className="feature-title">Tìm đối thủ</Card.Title>
                  <Card.Text className="feature-text">
                    Kết nối với cộng đồng người chơi cầu lông, tìm đối thủ phù
                    hợp với trình độ của bạn.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="feature-card">
                <Card.Body className="text-center">
                  <div className="feature-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <Card.Title className="feature-title">
                    Đảm bảo chất lượng
                  </Card.Title>
                  <Card.Text className="feature-text">
                    Tất cả sân đều được kiểm duyệt kỹ lưỡng để đảm bảo chất
                    lượng và an toàn tốt nhất.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Courts Section */}
      <section className="featured-courts-section">
        <Container>
          <Row className="mb-5">
            <Col className="text-center">
              <h2 className="section-title">Sân nổi bật</h2>
              <p className="section-subtitle">
                Những sân cầu lông chất lượng cao được yêu thích nhất
              </p>
            </Col>
          </Row>
          {loading ? (
            <Row>
              <Col className="text-center">
                <div className="loading-spinner">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Đang tải sân nổi bật...</p>
                </div>
              </Col>
            </Row>
          ) : (
            <>
              <Row>
                {featuredCourts.slice(0, 6).map((court) => (
                  <Col lg={4} md={6} className="mb-4" key={court._id}>
                    <CourtCard court={court} />
                  </Col>
                ))}
              </Row>
              <Row>
                <Col className="text-center">
                  <Button
                    variant="primary"
                    size="lg"
                    className="view-all-btn"
                    onClick={() => navigate("/courts")}
                  >
                    <i className="fas fa-eye me-2"></i>
                    Xem tất cả sân
                  </Button>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </section>

      {/* How it works Section */}
      <section className="how-it-works-section">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Cách thức hoạt động</h2>
              <p className="section-subtitle">
                Đặt sân chỉ với 3 bước đơn giản
              </p>
            </Col>
          </Row>
          <Row>
            <Col md={4} className="mb-4">
              <div className="step-card">
                <div className="step-number">1</div>
                <h4>Tìm kiếm sân</h4>
                <p>Tìm sân cầu lông phù hợp với vị trí và ngân sách của bạn</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="step-card">
                <div className="step-number">2</div>
                <h4>Đặt sân online</h4>
                <p>Chọn thời gian và thanh toán trực tuyến an toàn</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="step-card">
                <div className="step-number">3</div>
                <h4>Tận hưởng trận đấu</h4>
                <p>Đến sân và tận hưởng trận cầu lông tuyệt vời</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Container>
          <Row className="text-center">
            <Col>
              <h2 className="cta-title">Bạn có sân cầu lông?</h2>
              <p className="cta-subtitle">
                Đăng ký trở thành đối tác và bắt đầu kinh doanh với chúng tôi
                ngay hôm nay!
              </p>
              <div className="cta-buttons">
                <Button
                  variant="warning"
                  size="lg"
                  className="cta-btn me-3"
                  onClick={() => navigate("/register?role=owner")}
                >
                  <i className="fas fa-handshake me-2"></i>
                  Đăng ký làm chủ sân
                </Button>
                <Button
                  variant="outline-light"
                  size="lg"
                  className="cta-btn"
                  onClick={() => navigate("/posts")}
                >
                  <i className="fas fa-users me-2"></i>
                  Tham gia cộng đồng
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;
