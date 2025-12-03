SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `newbooks` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `mmsid` varchar(50) NOT NULL,
  `recordid` varchar(100) NOT NULL,
  `isbn` varchar(500) NOT NULL,
  `isbnprimo` varchar(100) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `coverurl` varchar(500) DEFAULT NULL,
  `title` varchar(500) NOT NULL,
  `activationdate` date NOT NULL,
  `publicationdate` varchar(10) NOT NULL,
  `dewey` varchar(100) NOT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `category` varchar(500) DEFAULT NULL,
  `subcategory` varchar(500) DEFAULT NULL,
  `booktype` char(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS  `holdshelfnumber` (
  `userid_encrypted` varchar(50) NOT NULL,
  `number` int DEFAULT '0',
  `additional_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `primary_id` varchar(50) NOT NULL,
  `payment_id` varchar(50) NOT NULL,
  `fee_id` varchar(50) NOT NULL,
  `finished` tinyint NOT NULL DEFAULT '0'
  CONSTRAINT constraint_type UNIQUE (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `libris_import_records` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `libris_id` varchar(50),
  `record_type` varchar(20) DEFAULT NULL,
  `record` longtext,
  `message` text,
  `attempts` int DEFAULT '0',
  `last_attempt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `mail_sent` tinyint NOT NULL DEFAULT '0',
  `status` enum('failed','success','max_attempts','') DEFAULT 'success'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4

CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4

CREATE TABLE IF NOT EXISTS `system_status` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;