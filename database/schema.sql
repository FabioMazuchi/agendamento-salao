CREATE DATABASE IF NOT EXISTS salao_maos_ungidas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE salao_maos_ungidas;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    phone VARCHAR(30),
    role ENUM('CLIENT', 'HAIRDRESSER') NOT NULL DEFAULT 'CLIENT',
    email_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    confirmation_token VARCHAR(100),
    password_reset_token VARCHAR(100),
    password_reset_expires DATETIME NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hairdresser_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    duration_minutes INT NOT NULL,
    price_type ENUM('FIXED', 'RANGE') NOT NULL DEFAULT 'FIXED',
    price DECIMAL(10, 2) NULL,
    price_min DECIMAL(10, 2) NULL,
    price_max DECIMAL(10, 2) NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hairdresser_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE work_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hairdresser_id INT NOT NULL,
    weekday TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (hairdresser_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE time_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hairdresser_id INT NOT NULL,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    FOREIGN KEY (hairdresser_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    hairdresser_id INT NOT NULL,
    service_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM(
        'BOOKED',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'BOOKED',
    price DECIMAL(10, 2) NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active_hairdresser_slot VARCHAR(100) GENERATED ALWAYS AS (
        IF(
            status IN ('BOOKED', 'COMPLETED'),
            CONCAT(
                hairdresser_id,
                '#',
                appointment_date,
                '#',
                start_time
            ),
            NULL
        )
    ) STORED,
    FOREIGN KEY (client_id) REFERENCES users (id),
    FOREIGN KEY (hairdresser_id) REFERENCES users (id),
    FOREIGN KEY (service_id) REFERENCES services (id),
    INDEX idx_schedule (
        hairdresser_id,
        appointment_date,
        status,
        start_time
    ),
    UNIQUE KEY uq_active_hairdresser_slot (active_hairdresser_slot)
);

CREATE TABLE review_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    appointment_id INT NOT NULL UNIQUE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users (id),
    FOREIGN KEY (appointment_id) REFERENCES appointments (id)
);