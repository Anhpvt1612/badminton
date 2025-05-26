
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge } from 'react-bootstrap';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [courts, setCourts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
    fetchCourts();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCourts = async () => {
    try {
      const response = await axios.get('/api/courts?status=pending');
      setCourts(response.data.courts || []);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const approveOwner = async (userId) => {
    try {
      await axios.put(`/api/admin/approve-owner/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Error approving owner:', error);
    }
  };

  const approveCourt = async (courtId) => {
    try {
      await axios.put(`/api/admin/approve-court/${courtId}`);
      fetchCourts();
    } catch (error) {
      console.error('Error approving court:', error);
    }
  };

  return (
    <Container className="py-5">
      <h2 className="mb-4">Admin Dashboard</h2>
      
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{stats.totalUsers}</Card.Title>
              <Card.Text>Tổng người dùng</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{stats.totalCourts}</Card.Title>
              <Card.Text>Tổng sân</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{stats.totalBookings}</Card.Title>
              <Card.Text>Tổng booking</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{stats.pendingCourts}</Card.Title>
              <Card.Text>Sân chờ duyệt</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Chủ sân chờ duyệt</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(user => user.role === 'owner' && !user.isApproved).map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="success"
                          onClick={() => approveOwner(user._id)}
                        >
                          Duyệt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Sân chờ duyệt</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Tên sân</th>
                    <th>Địa điểm</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courts.map(court => (
                    <tr key={court._id}>
                      <td>{court.name}</td>
                      <td>{court.location}</td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="success"
                          onClick={() => approveCourt(court._id)}
                        >
                          Duyệt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
