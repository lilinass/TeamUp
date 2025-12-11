-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 05 déc. 2025 à 10:13
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `koordybdd`
--

-- --------------------------------------------------------

--
-- Structure de la table `association`
--

CREATE TABLE `association` (
  `id_association` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `categorie` varchar(50) NOT NULL,
  `adresse` text NOT NULL,
  `telephone` int(10) NOT NULL,
  `url` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `date_creation` date NOT NULL,
  `image` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `equipe`
--

CREATE TABLE `equipe` (
  `id_equipe` int(11) NOT NULL,
  `nom_equipe` varchar(50) NOT NULL,
  `description_equipe` text NOT NULL,
  `categorie` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `evenement`
--

CREATE TABLE `evenement` (
  `id_evenement` int(11) NOT NULL,
  `titre_evenement` varchar(50) NOT NULL,
  `description_evenement` text NOT NULL,
  `date_debut_event` date NOT NULL,
  `date_fin_event` date NOT NULL,
  `lieu_event` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre`
--

CREATE TABLE `membre` (
  `id_membre` int(11) NOT NULL,
  `nom_membre` varchar(50) NOT NULL,
  `prenom_membre` varchar(50) NOT NULL,
  `mail_membre` text NOT NULL,
  `telephone_membre` int(10) NOT NULL,
  `password_membre` varchar(50) NOT NULL,
  `date_naissance` date NOT NULL,
  `age` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre_activite`
--

CREATE TABLE `membre_activite` (
  `id_membre_activite` int(11) NOT NULL,
  `id_equipe` int(11) NOT NULL,
  `id_membre_asso` int(11) NOT NULL,
  `role_activite` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre_asso`
--

CREATE TABLE `membre_asso` (
  `id_membre_asso` int(11) NOT NULL,
  `role` varchar(50) NOT NULL,
  `date_adhesion` date NOT NULL,
  `id_asso` int(11) NOT NULL,
  `id_membre` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `participation`
--

CREATE TABLE `participation` (
  `id_participation` int(11) NOT NULL,
  `id_evenement` int(11) NOT NULL,
  `id_membre` int(11) NOT NULL,
  `presence` enum('absent','present','peut etre','en attente') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `association`
--
ALTER TABLE `association`
  ADD PRIMARY KEY (`id_association`);

--
-- Index pour la table `equipe`
--
ALTER TABLE `equipe`
  ADD PRIMARY KEY (`id_equipe`);

--
-- Index pour la table `evenement`
--
ALTER TABLE `evenement`
  ADD PRIMARY KEY (`id_evenement`);

--
-- Index pour la table `membre`
--
ALTER TABLE `membre`
  ADD PRIMARY KEY (`id_membre`);

--
-- Index pour la table `membre_activite`
--
ALTER TABLE `membre_activite`
  ADD PRIMARY KEY (`id_membre_activite`),
  ADD KEY `id_membre_asso` (`id_membre_asso`),
  ADD KEY `id_equipe` (`id_equipe`);

--
-- Index pour la table `membre_asso`
--
ALTER TABLE `membre_asso`
  ADD PRIMARY KEY (`id_membre_asso`),
  ADD KEY `id_asso` (`id_asso`),
  ADD KEY `id_membre` (`id_membre`);

--
-- Index pour la table `participation`
--
ALTER TABLE `participation`
  ADD PRIMARY KEY (`id_participation`);

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `membre_activite`
--
ALTER TABLE `membre_activite`
  ADD CONSTRAINT `id_equipe` FOREIGN KEY (`id_equipe`) REFERENCES `equipe` (`id_equipe`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `id_membre_asso` FOREIGN KEY (`id_membre_asso`) REFERENCES `membre_asso` (`id_membre_asso`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `membre_asso`
--
ALTER TABLE `membre_asso`
  ADD CONSTRAINT `id_asso` FOREIGN KEY (`id_asso`) REFERENCES `association` (`id_association`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `id_membre` FOREIGN KEY (`id_membre`) REFERENCES `membre` (`id_membre`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 05 déc. 2025 à 10:13
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `koordybdd`
--

-- --------------------------------------------------------

--
-- Structure de la table `association`
--

CREATE TABLE `association` (
  `id_association` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `categorie` varchar(50) NOT NULL,
  `adresse` text NOT NULL,
  `telephone` int(10) NOT NULL,
  `url` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `date_creation` date NOT NULL,
  `image` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `equipe`
--

CREATE TABLE `equipe` (
  `id_equipe` int(11) NOT NULL,
  `nom_equipe` varchar(50) NOT NULL,
  `description_equipe` text NOT NULL,
  `categorie` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `evenement`
--

CREATE TABLE `evenement` (
  `id_evenement` int(11) NOT NULL,
  `titre_evenement` varchar(50) NOT NULL,
  `description_evenement` text NOT NULL,
  `date_debut_event` date NOT NULL,
  `date_fin_event` date NOT NULL,
  `lieu_event` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre`
--

CREATE TABLE `membre` (
  `id_membre` int(11) NOT NULL,
  `nom_membre` varchar(50) NOT NULL,
  `prenom_membre` varchar(50) NOT NULL,
  `mail_membre` text NOT NULL,
  `telephone_membre` int(10) NOT NULL,
  `password_membre` varchar(50) NOT NULL,
  `date_naissance` date NOT NULL,
  `age` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre_activite`
--

CREATE TABLE `membre_activite` (
  `id_membre_activite` int(11) NOT NULL,
  `id_equipe` int(11) NOT NULL,
  `id_membre_asso` int(11) NOT NULL,
  `role_activite` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membre_asso`
--

CREATE TABLE `membre_asso` (
  `id_membre_asso` int(11) NOT NULL,
  `role` varchar(50) NOT NULL,
  `date_adhesion` date NOT NULL,
  `id_asso` int(11) NOT NULL,
  `id_membre` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `participation`
--

CREATE TABLE `participation` (
  `id_participation` int(11) NOT NULL,
  `id_evenement` int(11) NOT NULL,
  `id_membre` int(11) NOT NULL,
  `presence` enum('absent','present','peut etre','en attente') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `association`
--
ALTER TABLE `association`
  ADD PRIMARY KEY (`id_association`);

--
-- Index pour la table `equipe`
--
ALTER TABLE `equipe`
  ADD PRIMARY KEY (`id_equipe`);

--
-- Index pour la table `evenement`
--
ALTER TABLE `evenement`
  ADD PRIMARY KEY (`id_evenement`);

--
-- Index pour la table `membre`
--
ALTER TABLE `membre`
  ADD PRIMARY KEY (`id_membre`);

--
-- Index pour la table `membre_activite`
--
ALTER TABLE `membre_activite`
  ADD PRIMARY KEY (`id_membre_activite`),
  ADD KEY `id_membre_asso` (`id_membre_asso`),
  ADD KEY `id_equipe` (`id_equipe`);

--
-- Index pour la table `membre_asso`
--
ALTER TABLE `membre_asso`
  ADD PRIMARY KEY (`id_membre_asso`),
  ADD KEY `id_asso` (`id_asso`),
  ADD KEY `id_membre` (`id_membre`);

--
-- Index pour la table `participation`
--
ALTER TABLE `participation`
  ADD PRIMARY KEY (`id_participation`);

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `membre_activite`
--
ALTER TABLE `membre_activite`
  ADD CONSTRAINT `id_equipe` FOREIGN KEY (`id_equipe`) REFERENCES `equipe` (`id_equipe`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `id_membre_asso` FOREIGN KEY (`id_membre_asso`) REFERENCES `membre_asso` (`id_membre_asso`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `membre_asso`
--
ALTER TABLE `membre_asso`
  ADD CONSTRAINT `id_asso` FOREIGN KEY (`id_asso`) REFERENCES `association` (`id_association`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `id_membre` FOREIGN KEY (`id_membre`) REFERENCES `membre` (`id_membre`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;