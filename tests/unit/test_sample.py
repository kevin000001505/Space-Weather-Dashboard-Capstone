"""
Sample unit test file
Demonstrates basic pytest structure for DAEN Capstone projects
"""

import pytest


def test_sample_passing():
    """Sample passing test"""
    assert 1 + 1 == 2


def test_sample_string():
    """Sample string test"""
    result = "Hello, DAEN!"
    assert "DAEN" in result


def test_sample_list():
    """Sample list test"""
    sample_list = [1, 2, 3, 4, 5]
    assert len(sample_list) == 5
    assert 3 in sample_list


@pytest.fixture
def sample_data():
    """Sample fixture"""
    return {"name": "DAEN Project", "version": "0.1.0"}


def test_with_fixture(sample_data):
    """Test using a fixture"""
    assert sample_data["name"] == "DAEN Project"
    assert sample_data["version"] == "0.1.0"


class TestSampleClass:
    """Sample test class"""

    def test_method_one(self):
        """Test method one"""
        assert True

    def test_method_two(self):
        """Test method two"""
        value = 10
        assert value > 0


# Run tests with: pytest tests/unit/test_sample.py -v
