import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="navbar-icon">📊</span>
          <h1 className="navbar-title">Poe 积分监控</h1>
        </div>
        <div className="navbar-subtitle">实时追踪您的 Poe 积分消耗情况</div>
      </div>
    </nav>
  );
};

export default Navbar;

