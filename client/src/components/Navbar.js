import React from 'react';
import { Navbar as BootstrapNavbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <BootstrapNavbar bg="primary" variant="dark" expand="lg" sticky="top">
      <Container>
        <LinkContainer to="/">
          <BootstrapNavbar.Brand>
            <i className="fas fa-shuttlecock me-2"></i>
            BadmintonBooking
          </BootstrapNavbar.Brand>
        </LinkContainer>
        
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Trang chủ</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/courts">
              <Nav.Link>Sân cầu lông</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/posts">
              <Nav.Link>Tìm đối thủ</Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav>
            {isAuthenticated ? (
              <>
                <LinkContainer to="/chat">
                  <Nav.Link>
                    <i className="fas fa-comments me-1"></i>
                    Chat
                  </Nav.Link>
                </LinkContainer>
                
                <NavDropdown title={user?.name} id="user-dropdown">
                  <LinkContainer to="/profile">
                    <NavDropdown.Item>Hồ sơ</NavDropdown.Item>
                  </LinkContainer>
                  <LinkContainer to="/my-bookings">
                    <NavDropdown.Item>Lịch đặt sân</NavDropdown.Item>
                  </LinkContainer>
                  
                  {isOwner && (
                    <>
                      <NavDropdown.Divider />
                      <LinkContainer to="/my-courts">
                        <NavDropdown.Item>Quản lý sân</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/dashboard">
                        <NavDropdown.Item>Dashboard</NavDropdown.Item>
                      </LinkContainer>
                    </>
                  )}
                  
                  {isAdmin && (
                    <>
                      <NavDropdown.Divider />
                      <LinkContainer to="/admin">
                        <NavDropdown.Item>Quản trị</NavDropdown.Item>
                      </LinkContainer>
                    </>
                  )}
                  
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    Đăng xuất
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>Đăng nhập</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>Đăng ký</Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;