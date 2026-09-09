BEGIN;
UPDATE challenges SET name='Los 3000 de Buyse',
       description='Las 213 cumbres de más de 3.000 m del Pirineo de la lista de Buyse.',
       translations='{"es": {"name": "Los 3000 de Buyse", "description": "Las 213 cumbres de más de 3.000 m del Pirineo de la lista de Buyse."}, "ca": {"name": "Els 3000 de Buyse", "description": "Els 213 cims de més de 3.000 m del Pirineu de la llista de Buyse."}, "en": {"name": "Buyse''s 3000ers", "description": "The 213 summits above 3,000 m in the Pyrenees from the list by Buyse."}, "fr": {"name": "Les 3000 de Buyse", "description": "Les 213 sommets de plus de 3 000 m des Pyrénées de la liste de Buyse."}, "de": {"name": "Die 3000er von Buyse", "description": "Die 213 Gipfel über 3.000 m in den Pyrenäen aus der Liste von Buyse."}}'::jsonb, "updatedAt"=NOW()
 WHERE slug='els-3000-del-pirineu';
COMMIT;
