"""
AccuCloud Pro 2026 - Backend API Tests
Tests: Login, Dashboard, Reports, User Management, Payroll endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_admin_demo(self):
        """Test login with admin@demo.com credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@demo.com"
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestDashboard:
    """Dashboard endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats(self, admin_token):
        """Test dashboard stats endpoint returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify required fields
        assert "total_sales" in data
        assert "cash_box" in data
        assert "total_products" in data
        assert "employees" in data
        assert "weekly_sales" in data


class TestUserManagement:
    """User Management (Admin only) endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        return response.json()["access_token"]
    
    def test_get_company_users(self, admin_token):
        """Test admin can get company users list"""
        response = requests.get(
            f"{BASE_URL}/api/users/company",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        # Verify user structure
        user = users[0]
        assert "id" in user
        assert "email" in user
        assert "role" in user
        assert "permissions" in user
    
    def test_create_and_delete_user(self, admin_token):
        """Test create a new user and then delete it"""
        # Create user
        new_user = {
            "email": "TEST_newuser@accucloud.com",
            "password": "TestPass123!",
            "name": "Test User Created By API",
            "role": "user",
            "permissions": ["dashboard", "sales"]
        }
        create_response = requests.post(
            f"{BASE_URL}/api/users/company",
            json=new_user,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        created_user = create_response.json()
        assert created_user["email"] == new_user["email"]
        assert created_user["name"] == new_user["name"]
        assert created_user["role"] == new_user["role"]
        
        # Delete the created user
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/company/{created_user['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
    
    def test_non_admin_cannot_access_users(self):
        """Test that non-admin users cannot access user management"""
        # First login as non-admin (bodeguero) - seed data password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "bodeguero@demo.com",
            "password": "bodeguero123"
        })
        # If login fails, skip this test
        if login_response.status_code != 200:
            pytest.skip("Non-admin user not available")
        
        token = login_response.json()["access_token"]
        
        # Try to access users endpoint
        response = requests.get(
            f"{BASE_URL}/api/users/company",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403


class TestPayroll:
    """Payroll endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        return response.json()["access_token"]
    
    def test_get_payroll(self, admin_token):
        """Test payroll endpoint returns data with legacy defaults"""
        response = requests.get(
            f"{BASE_URL}/api/payroll",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        payroll_data = response.json()
        assert isinstance(payroll_data, list)
        
        # Verify payroll records have all required fields (including legacy defaults)
        if len(payroll_data) > 0:
            record = payroll_data[0]
            assert "employee_name" in record
            assert "days_worked" in record
            assert "base_salary" in record
            # New fields that should be present (with defaults for legacy data)
            assert "extra_hours" in record
            assert "net_salary" in record
            assert "employer_total_cost" in record


class TestReportsData:
    """Reports data endpoint tests (Products, Sales for charts)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        return response.json()["access_token"]
    
    def test_get_products(self, admin_token):
        """Test products endpoint for Reports page"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        if len(products) > 0:
            product = products[0]
            assert "name" in product
            assert "cost_buy" in product
            assert "cost_sell" in product
            assert "profit_percentage" in product
    
    def test_get_sales(self, admin_token):
        """Test sales endpoint for Reports page"""
        response = requests.get(
            f"{BASE_URL}/api/sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        sales = response.json()
        assert isinstance(sales, list)
        if len(sales) > 0:
            sale = sales[0]
            assert "total" in sale
            assert "created_at" in sale


class TestAuthMe:
    """Auth/Me endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "Demo2026!"
        })
        return response.json()["access_token"]
    
    def test_get_current_user(self, admin_token):
        """Test getting current user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user["email"] == "admin@demo.com"
        assert user["role"] == "admin"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
