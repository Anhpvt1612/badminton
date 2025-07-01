import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "react-toastify/dist/ReactToastify.css";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Courts from "./pages/Courts";
import CourtDetail from "./pages/CourtDetail";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import MyBookings from "./pages/MyBookings";
import MyCourts from "./pages/MyCourts";
import Posts from "./pages/Posts";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/AdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import MyPosts from "./pages/MyPosts";
import TransactionHistory from "./pages/TransactionHistory";
import CourtStats from "./pages/CourtStats";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          {/* Thêm wrapper để tránh navbar che nội dung */}
          <div className="app-content">
            <main className="container-fluid px-0">
              <Routes>
                {/* Auth routes - không cần padding */}
                <Route
                  path="/login"
                  element={
                    <div className="auth-page">
                      <Login />
                    </div>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <div className="auth-page">
                      <Register />
                    </div>
                  }
                />

                {/* Public routes */}
                <Route
                  path="/"
                  element={
                    <div className="home-page">
                      <Home />
                    </div>
                  }
                />
                <Route
                  path="/courts"
                  element={
                    <div className="courts-page">
                      <Courts />
                    </div>
                  }
                />
                <Route
                  path="/courts/:id"
                  element={
                    <div className="court-detail-page">
                      <CourtDetail />
                    </div>
                  }
                />
                <Route
                  path="/posts"
                  element={
                    <div className="page-container">
                      <Posts />
                    </div>
                  }
                />
                <Route
                  path="/my-posts"
                  element={
                    <div className="page-container">
                      <MyPosts />
                    </div>
                  }
                />
                <Route
                  path="/payment/success"
                  element={
                    <div className="page-container">
                      <PaymentSuccess />
                    </div>
                  }
                />
                <Route
                  path="/payment/failure"
                  element={
                    <div className="page-container">
                      <PaymentFailure />
                    </div>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <div className="page-container">
                      <TransactionHistory />
                    </div>
                  }
                />
                <Route
                  path="/courts/:id/stats"
                  element={
                    <div className="page-container">
                      <CourtStats />
                    </div>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <div className="page-container">
                        <Profile />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <div className="page-container">
                        <OwnerDashboard />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <div className="page-container">
                        <MyBookings />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-courts"
                  element={
                    <ProtectedRoute roles={["owner"]}>
                      <div className="page-container">
                        <MyCourts />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <div className="page-container">
                        <Chat />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/group/:groupId"
                  element={
                    <ProtectedRoute>
                      <div className="page-container">
                        <Chat />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <div className="page-container">
                        <AdminDashboard />
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{ marginTop: "80px" }} // Đảm bảo toast không bị che bởi navbar
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
