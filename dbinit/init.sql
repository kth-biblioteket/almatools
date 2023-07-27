SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `books` (
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
) ENGINE=InnoDB AUTO_INCREMENT=2244 DEFAULT CHARSET=utf8;


ALTER TABLE `books`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2244;