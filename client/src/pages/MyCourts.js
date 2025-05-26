
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const MyCourts = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchMyCourts();
  }, []);

  const fetchMyCourts = async () => {
    try {
      const response = await axios.get('/api/courts/my-courts');
      setCourts(response.data.courts || []);
    } catch (error) {
      console.error('Error fetching courts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">Đang tải...</div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Sân của tôi</h2>
      
      {courts.length === 0 ? (
        <Alert variant="info">
          Bạn chưa có sân nào. Hãy thêm sân mới để bắt đầu kinh doanh!
        </Alert>
      ) : (
        <Row>
          {courts.map(court => (
            <Col md={6} lg={4} key={court._id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{court.name}</Card.Title>
                  <Card.Text>{court.location}</Card.Text>
                  <Card.Text>
                    <small className="text-muted">
                      Trạng thái: <span className={`badge bg-${court.status === 'approved' ? 'success' : 'warning'}`}>
                        {court.status}
                      </span>
                    </small>
                  </Card.Text>
                  <Button variant="outline-primary" size="sm">
                    Xem chi tiết
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyCourts;
