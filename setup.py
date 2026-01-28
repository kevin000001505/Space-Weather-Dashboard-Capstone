from setuptools import setup, find_packages
import os

# Read the contents of README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Read requirements from requirements.txt
with open(os.path.join(this_directory, 'requirements.txt'), encoding='utf-8') as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name='daen-capstone-project',
    version='0.1.0',
    author='GMU DAEN Capstone Team',
    author_email='team@example.com',
    description='GMU DAEN Capstone Project - Data Analytics Engineering',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/organizations/GMU-DAEN-Program',
    project_urls={
        'Bug Tracker': 'https://github.com/organizations/GMU-DAEN-Program/issues',
        'Documentation': 'https://github.com/organizations/GMU-DAEN-Program/docs',
        'Source Code': 'https://github.com/organizations/GMU-DAEN-Program',
    },
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Education',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.8',
    install_requires=requirements,
    extras_require={
        'dev': [
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'black>=23.7.0',
            'flake8>=6.0.0',
            'pylint>=2.17.0',
            'sphinx>=7.0.0',
        ],
        'test': [
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'pytest-mock>=3.11.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'daen-app=src.api.app:main',  # Adjust based on your application structure
        ],
    },
    include_package_data=True,
    zip_safe=False,
)
