SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `newbooks` (
  `id` int(11) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `newbooks`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `newbooks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


CREATE TABLE `holdshelfnumber` (
  `userid_encrypted` varchar(50) NOT NULL,
  `number` int DEFAULT '0',
  `additional_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS payments (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    primary_id VARCHAR(50) NOT NULL,
    payment_id VARCHAR(50) NOT NULL UNIQUE,
    fee_id VARCHAR(50) NOT NULL,
    finished TINYINT(4) NOT NULL DEFAULT '0',
    CONSTRAINT constraint_type UNIQUE (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;;