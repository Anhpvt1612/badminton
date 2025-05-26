import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourtCard from '../components/CourtCard';

const Home = () => {
  const [featuredCourts, setFeaturedCourts] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedCourts();
  }, []);

  const fetchFeaturedCourts = async () => {
    try {
      const response = await axios.get('/api/courts?limit=6');
      setFeaturedCourts(response.data.courts || []);
    } catch (error) {
      console.error('Error fetching featured courts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/courts?location=${encodeURIComponent(searchLocation)}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">
                Đặt sân cầu lông dễ dàng
              </h1>
              <p className="lead mb-4">
                Tìm và đặt sân cầu lông chất lượng cao gần bạn. 
                Kết nối với cộng đồng người chơi cầu lông.
              </p>
              <Form onSubmit={handleSearch}>
                <InputGroup size="lg">
                  <Form.Control
                    type="text"
                    placeholder="Nhập địa điểm bạn muốn tìm..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                  <Button variant="warning" type="submit">
                    <i className="fas fa-search me-2"></i>
                    Tìm kiếm
                  </Button>
                </InputGroup>
              </Form>
            </Col>
            <Col lg={6} className="text-center">
              <img 
                src="/hero-badminton.jpg" 
                alt="Badminton" 
                className="img-fluid rounded"
                style={{ maxHeight: '400px' }}
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="mb-4">Tại sao chọn chúng tôi?</h2>
            </Col>
          </Row>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="text-primary mb-3">
                    <i className="fas fa-clock fa-3x"></i>
                  </div>
                  <Card.Title>Đặt sân 24/7</Card.Title>
                  <Card.Text>
                    Đặt sân bất cứ lúc nào, bất cứ đâu với hệ thống đặt sân trực tuyến tiện lợi.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="text-primary mb-3">
                    <i className="fas fa-users fa-3x"></i>
                  </div>
                  <Card.Title>Tìm đối thủ</Card.Title>
                  <Card.Text>
                    Kết nối với cộng đồng người chơi cầu lông, tìm đối thủ phù hợp với trình độ.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="text-primary mb-3">
                    <i className="fas fa-shield-alt fa-3x"></i>
                  </div>
                  <Card.Title>Đảm bảo chất lượng</Card.Title>
                  <Card.Text>
                    Tất cả sân đều được kiểm duyệt kỹ lưỡng để đảm bảo chất lượng tốt nhất.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Courts */}
      <section className="py-5 bg-light">
        <Container>
          <Row className="mb-4">
            <Col>
              <h2 className="text-center mb-4">Sân nổi bật</h2>
            </Col>
          </Row>
          {loading ? (
            <Row>
              <Col className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </Col>
            </Row>
          ) : (
            <Row>
              {featuredCourts.map((court) => (
                <Col md={4} className="mb-4" key={court._id}>
                  <CourtCard court={court} />
                </Col>
              ))}
            </Row>
          )}
          <Row>
            <Col className="text-center">
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => navigate('/courts')}
              >
                Xem tất cả sân
              </Button>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-primary text-white">
        <Container>
          <Row className="text-center">
            <Col>
              <h2 className="mb-4">Bạn có sân cầu lông?</h2>
              <p className="lead mb-4">
                Đăng ký trở thành đối tác và bắt đầu kinh doanh với chúng tôi ngay hôm nay!
              </p>
              <Button 
                variant="warning" 
                size="lg"
                onClick={() => navigate('/register?role=owner')}
              >
                Đăng ký làm chủ sân
              </Button>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;