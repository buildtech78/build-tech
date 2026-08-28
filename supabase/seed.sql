-- ============================================================================
-- BUILD.TECH — Données d'exemple (OPTIONNEL)
-- ----------------------------------------------------------------------------
-- À exécuter dans le SQL Editor si tu veux quelques services/composants de
-- test tout de suite. Tu pourras tout modifier ou supprimer ensuite depuis
-- le panneau d'administration (/admin). Sans risque : n'insère que des
-- données de démonstration, aucune donnée utilisateur.
-- ============================================================================

insert into public.services (name, description, price, active, sort_order) values
  ('Nettoyage PC', 'Dépoussiérage complet, changement de pâte thermique, vérification des ventilateurs.', 39.90, true, 0),
  ('Montage PC', 'Assemblage sur mesure selon votre budget et votre usage (gaming, bureautique, création).', 89.00, true, 1),
  ('Changement de composants', 'Remplacement ou ajout d''un composant (RAM, SSD, GPU, alimentation...).', 29.00, true, 2);

insert into public.component_categories (name, sort_order) values
  ('Carte graphique', 0),
  ('Processeur', 1),
  ('RAM', 2),
  ('SSD', 3),
  ('Alimentation', 4);

insert into public.components (title, description, price, negotiable, available, category_id)
select 'GTX 1060 6GB', 'Carte graphique d''occasion, testée et fonctionnelle.', 89.00, true, true, id
from public.component_categories where name = 'Carte graphique';

insert into public.components (title, description, price, negotiable, available, category_id)
select 'Ryzen 5 3600', 'Processeur 6 cœurs / 12 threads, avec ventirad d''origine.', 65.00, false, true, id
from public.component_categories where name = 'Processeur';

insert into public.components (title, description, price, negotiable, available, category_id)
select 'Kit RAM 16GB DDR4 3200MHz', '2x8GB, faible latence, testé sous MemTest86.', 35.00, true, true, id
from public.component_categories where name = 'RAM';
