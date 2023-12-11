CREATE TABLE IF NOT EXISTS payments (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    primary_id VARCHAR(50) NOT NULL,
    payment_id VARCHAR(50) NOT NULL UNIQUE,
    fee_id VARCHAR(50) NOT NULL,
    finished TINYINT(4) NOT NULL DEFAULT '0',
    CONSTRAINT constraint_type UNIQUE (payment_id)
);