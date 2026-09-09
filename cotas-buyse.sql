-- Frondella SW y Diente Royo: se adopta la cota de Buyse, que las pone sobre 3000 m.
--   Frondella SW  2992 -> 3001  (Buyse; es el tresmil mas occidental del Pirineo)
--   Diente Royo   2943 -> 3010  (Buyse "Dent Royo"; la coordenada de la ficha cae a 13 m de este pico)
-- Cruzan la banda de rareza (gentian <3000 / tundra >=3000), asi que rarityId pasa a tundra:
-- si no, quedarian como los unicos picos de mas de 3000 m con 30 EP en vez de 60.
-- Ninguna de las dos tiene ascensiones registradas, asi que no hay user_stats que recalcular.
BEGIN;

UPDATE peaks SET "altitudeM" = 3001, "rarityId" = 'tundra', "mountainRange" = 'Balaitús - Infierno - Argualas'
 WHERE id = 'dc6018c4-8093-4868-80eb-fc8e7eab64ce';

UPDATE peaks SET "altitudeM" = 3010, "rarityId" = 'tundra', "mountainRange" = 'Posets - Eriste'
 WHERE id = 'b205bb14-c0eb-4d3d-b0d5-5729e2f522eb';

INSERT INTO challenge_peaks ("challengeId", "peakId") VALUES
  ('tresmils3000', 'dc6018c4-8093-4868-80eb-fc8e7eab64ce'),
  ('tresmils3000', 'b205bb14-c0eb-4d3d-b0d5-5729e2f522eb')
ON CONFLICT DO NOTHING;

COMMIT;
