-- Rellena la comarca de los picos del reto FEEC que la tenían vacía en producción.
-- Valor tomado de la ficha oficial de la FEEC; cuando la FEEC da varias comarcas
-- (cimas de frontera) se toma la primera, porque el catálogo nunca guarda valores
-- compuestos. El WHERE exige comarca vacía: nunca pisa un dato ya existente.
BEGIN;
UPDATE peaks SET comarca = 'Alta Ribagorça' WHERE id = '4c39b522-2a8e-4ec4-bead-ac02d8943be6' AND (comarca IS NULL OR comarca = '');  -- Gran Tuc de Colomèrs
UPDATE peaks SET comarca = 'Anoia' WHERE id = '321f27b3-b7fc-492b-a8ac-4d83ad8b7827' AND (comarca IS NULL OR comarca = '');  -- Sant Jeroni
UPDATE peaks SET comarca = 'Baix Llobregat' WHERE id = 'c879cba3-ecbb-4f98-b6c8-f84ffc7814fa' AND (comarca IS NULL OR comarca = '');  -- Sant Salvador de les Espases
UPDATE peaks SET comarca = 'Cerdanya' WHERE id = '2e4d6be6-d51a-43ef-a2fe-36ab4f9d7bdc' AND (comarca IS NULL OR comarca = '');  -- Puigpedrós
UPDATE peaks SET comarca = 'Osona' WHERE id = '14c195f0-1a1c-4b1e-b94c-571daa5501b9' AND (comarca IS NULL OR comarca = '');  -- Milany
UPDATE peaks SET comarca = 'Pallars Jussà' WHERE id = '42302691-5233-43fb-94ea-4184623c1368' AND (comarca IS NULL OR comarca = '');  -- Pic de Peguera
UPDATE peaks SET comarca = 'Pallars Sobirà' WHERE id = '6e720048-75e4-4fb9-827a-2e9751575e9e' AND (comarca IS NULL OR comarca = '');  -- Pic de Sotllo
UPDATE peaks SET comarca = 'Pallars Sobirà' WHERE id = '21b88d79-2d12-4e7d-91d2-e8aec02015c0' AND (comarca IS NULL OR comarca = '');  -- Pica d'Estats
UPDATE peaks SET comarca = 'Val d''Aran' WHERE id = '978f5308-dee5-43e8-92be-80e76089145f' AND (comarca IS NULL OR comarca = '');  -- Pic de Maubermé / Tuc de Maubèrme

-- La FEEC solo dice «Andorra», y el catálogo usa la parròquia (La Massana, Encamp…).
-- Tristaina está a Ordino, pero ese dato no sale de ninguna de las dos fuentes:
-- descomenta la línea si quieres ponerlo, o déjalo vacío y ordenará al final.

-- UPDATE peaks SET comarca = 'Ordino' WHERE id = '9042c502-46af-4bf4-9da1-c9a605c00187' AND (comarca IS NULL OR comarca = '');  -- Tristaina / Tristagne

COMMIT;
