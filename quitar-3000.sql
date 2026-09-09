-- Quita del reto las cimas que Buyse descarto por prominencia <10 m.
-- Identificadas con coordenadas de Wikidata (210 de las 212 de Buyse): son los picos
-- del catalogo que no se corresponden con ninguna entrada suya.
-- Se conservan Bachimala Chicot N y S: a Buyse le queda «Petit Bachimala» sin emparejar
-- y Wikidata le da la coordenada de la cumbre madre, asi que uno de los dos puede serlo.
-- Solo se borran filas de challenge_peaks; los picos siguen en el catalogo.
BEGIN;
DELETE FROM challenge_peaks WHERE "challengeId" = 'tresmils3000' AND "peakId" IN (
  'd8867e7f-be68-4a82-8d79-e4545e8c3be7',
  'ae530ba9-8d8d-47a0-b8ca-761b73e66109',
  '8f8a1eca-41ab-44b4-8a64-2f3e4d4b5464',
  'f595abc4-7d82-4839-a095-ab6a74814e5e',
  '952947fc-7eaa-4059-bd38-c312b8d127e3',
  'badb4731-b782-4d9f-9587-2e3521fe8103',
  '2b1e97de-3336-49c5-ac90-121a0af44253',
  '768a44c1-4d89-49b1-abf2-df40f9d40853',
  'fd236846-3713-4cda-ae0a-3a1840858773',
  'da3b57d1-8921-42c5-ad64-1f615616f063',
  'd4d98730-ec29-4b68-9c5e-fe3bf90556cd',
  'c06a977a-4d49-4812-815f-ba44874622f0',
  'ec8ff817-5a39-44ea-9844-e78946f2043e',
  'b2cb9fb0-3f2b-4cd5-9f8d-c73175d5b061',
  '279d058b-c58c-4cc4-a63b-e756a8c20c53',
  '773922e9-88dc-47c9-b1d8-d087125fba3a',
  '9d8baaa6-0efd-4bf1-b8f9-df98ff1ee31d',
  '33f1a1bf-e885-4631-8709-06946ffc6b55',
  'fce1fc7d-1ed6-49fd-ac1a-b764e173ba1f',
  '2686ec5c-2e5b-4f9c-a591-7089b1d66010',
  'b90d96ec-96ba-4900-80a6-5b30b87b6546',
  'd890a98d-6ea3-4f55-b4e4-41d8596a52c1',
  'ea71a6fc-cf41-40c8-964e-9fcf22bbf4af',
  '2d182d5f-3273-4986-ae9a-985d2e32f1e9',
  'f90d8b13-cf3f-4436-8a72-0e40f4dab090',
  '00810abe-c431-4fef-af14-3a5ba57c5331');

COMMIT;
