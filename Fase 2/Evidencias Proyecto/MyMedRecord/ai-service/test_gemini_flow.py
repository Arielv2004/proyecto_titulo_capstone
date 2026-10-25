"""Prueba del flujo automático y degradación sin consumir API externa."""
import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app
from core.config import settings
from models.schemas import DocumentExtractionResponse, MedicationEntity

class GeminiFlow(unittest.TestCase):
    def test_automatic_processing_and_fallback(self):
        with patch.object(settings, 'AI_SERVICE_TOKEN', 'x' * 40), patch.object(settings, 'EXTERNAL_AI_ENABLED', True), patch.object(settings, 'LLM_API_KEY', 'test-only'), patch('routers.extract.local_process', return_value='RECETA FICTICIA: PARACETAMOL 500 mg cada 8 horas'), patch('services.llm_service.LLMService.extract_clinical_entities', new_callable=AsyncMock) as provider, TestClient(app) as client:
            def send():
                return client.post('/api/v1/ai/process-document', headers={'x-service-token': 'x'*40}, files={'file': ('ficticio.pdf', b'%PDF-1.4 ficticio', 'application/pdf')})
            provider.return_value = DocumentExtractionResponse(document_type='RECETA', processing_mode='gemini', medications=[MedicationEntity(name='PARACETAMOL', dosage='500 mg')])
            result = send()
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()['medications'][0]['name'], 'PARACETAMOL')
            self.assertEqual(result.json()['processing_mode'], 'gemini')
            provider.assert_awaited_once()
            provider.side_effect = RuntimeError('SECRET_PROVIDER_ERROR')
            result = send()
            self.assertEqual(result.json()['processing_mode'], 'local')
            self.assertIn('RECETA FICTICIA', result.json()['raw_text'])
            self.assertTrue(result.json()['processing_notice'])
            self.assertNotIn('SECRET_PROVIDER_ERROR', result.text)
            provider.reset_mock()
            with patch.object(settings, 'EXTERNAL_AI_ENABLED', False):
                self.assertEqual(send().json()['processing_mode'], 'local')
            provider.assert_not_awaited()
            with patch.object(settings, 'LLM_API_KEY', ''):
                self.assertTrue(send().json()['processing_notice'])
            provider.assert_not_awaited()

if __name__ == '__main__':
    unittest.main()
