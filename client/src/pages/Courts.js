import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Pagination, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CourtCard from '../components/CourtCard';

const Courts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
    amenities: []
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const amenitiesList = [
    'parking', 'lighting', 'airConditioning', 'shower', 'equipment',
    'cafe', 'wifi', 'security', 'firstAid', 'lockers'
  ];

  const amenityLabels = {
    parking: 'Bãi đỗ xe',
    lighting: 'Đèn chiếu sáng',
    airConditioning: 'Điều hòa',
    shower: 'Phòng tắm',
    equipment: 'Dụng cụ',
    cafe: 'Quán cafe',
    wifi: 'WiFi',
    security: 'Bảo vệ',
    firstAid: 'Y tế',
    lockers: 'Tủ khóa'
  };

  useEffect(() => {
    fetchCourts();
  }, [searchParams]);

  const fetchCourts = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.location) params.append('location', filters.location);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.amenities.length > 0) {
        filters.amenities.forEach(amenity => params.append('amenities', amenity));
      }
      params.append('page', page);
      params.append('limit', '12');

      const response = await axios.get(`/api/courts?${params.toString()}`);
      setCourts(response.data.courts || []);
      setPagination({
        currentPage: response.data.currentPage || 1,
        totalPages: response.data.totalPages || 1,
        total: response.data.total || 0
      });
    } catch (error) {
      console.error('Error fetching courts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFilters(prev => ({
        ...prev,
        amenities: checked 
          ? [...prev.amenities, value]
          : prev.amenities.filter(a => a !== value)
      }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourts(1);
  };

  const handlePageChange = (page) => {
    fetchCourts(page);
  };

  return (
    <Container className="py-4">
      <Row>
        <Col lg={3} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Bộ lọc tìm kiếm</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSearch}>
                <Form.Group className="mb-3">
                  <Form.Label>Địa điểm</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    placeholder="Nhập địa điểm..."
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Khoảng giá (VNĐ/giờ)</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="number"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        placeholder="Từ"
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="number"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        placeholder="Đến"
                      />
                    </Col>
                  </Row>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Tiện ích</Form.Label>
                  {amenitiesList.map(amenity => (
                    <Form.Check
                      key={amenity}
                      type="checkbox"
                      id={amenity}
                      value={amenity}
                      label={amenityLabels[amenity]}
                      checked={filters.amenities.includes(amenity)}
                      onChange={handleFilterChange}
                    />
                  ))}
                </Form.Group>
                
                <Button variant="primary" type="submit" className="w-100">
                  Tìm kiếm
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={9}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Danh sách sân cầu lông</h2>
            <span className="text-muted">
              Tìm thấy {pagination.total} sân
            </span>
          </div>
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-5">
              <h4>Không tìm thấy sân nào</h4>
              <p className="text-muted">Thử thay đổi bộ lọc tìm kiếm</p>
            </div>
          ) : (
            <>
              <Row>
                {courts.map(court => (
                  <Col md={6} lg={4} className="mb-4" key={court._id}>
                    <CourtCard court={court} />
                  </Col>
                ))}
              </Row>
              
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                    />
                    
                    {[...Array(pagination.totalPages)].map((_, index) => {
                      const page = index + 1;
                      if (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
                      ) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === pagination.currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.currentPage === pagination.totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Courts;