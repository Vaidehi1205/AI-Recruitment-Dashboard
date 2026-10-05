import unittest
from unittest.mock import ANY, MagicMock, patch

from app.email_service import EmailService
from app.config import settings


class EmailServiceTests(unittest.TestCase):
    @patch('app.email_service.smtplib.SMTP')
    def test_send_emails_reuses_single_smtp_session(self, smtp_cls):
        smtp_client = MagicMock()
        smtp_cls.return_value.__enter__.return_value = smtp_client

        with patch.object(settings, 'smtp_user', 'mailer@example.com', create=True), \
             patch.object(settings, 'smtp_password', 'secret', create=True), \
             patch.object(settings, 'sender_email', 'noreply@example.com', create=True), \
             patch.object(settings, 'smtp_server', 'smtp.example.com', create=True), \
             patch.object(settings, 'smtp_port', 587, create=True), \
             patch.object(settings, 'sender_name', 'RecruitAI', create=True):

            result = EmailService.send_emails([
                {
                    'recipient_email': 'candidate1@example.com',
                    'recipient_name': 'Candidate One',
                    'subject': 'Interview update',
                    'body': 'Hello Candidate One',
                    'html_body': '<p>Hello</p>',
                },
                {
                    'recipient_email': 'candidate2@example.com',
                    'recipient_name': 'Candidate Two',
                    'subject': 'Interview update',
                    'body': 'Hello Candidate Two',
                    'html_body': '<p>Hello</p>',
                },
            ])

        self.assertTrue(result['success'])
        smtp_cls.assert_called_once_with('smtp.example.com', 587, timeout=10)
        smtp_client.ehlo.assert_called()
        smtp_client.login.assert_called_once_with('mailer@example.com', 'secret')
        self.assertEqual(smtp_client.sendmail.call_count, 2)
        smtp_client.sendmail.assert_any_call('noreply@example.com', ['candidate1@example.com'], ANY)
        smtp_client.sendmail.assert_any_call('noreply@example.com', ['candidate2@example.com'], ANY)

    @patch('app.email_service.smtplib.SMTP')
    def test_send_emails_deduplicates_duplicate_recipient_addresses(self, smtp_cls):
        smtp_client = MagicMock()
        smtp_cls.return_value.__enter__.return_value = smtp_client

        with patch.object(settings, 'smtp_user', 'mailer@example.com', create=True), \
             patch.object(settings, 'smtp_password', 'secret', create=True), \
             patch.object(settings, 'sender_email', 'noreply@example.com', create=True), \
             patch.object(settings, 'smtp_server', 'smtp.example.com', create=True), \
             patch.object(settings, 'smtp_port', 587, create=True), \
             patch.object(settings, 'sender_name', 'RecruitAI', create=True):

            result = EmailService.send_emails([
                {
                    'recipient_email': 'same@example.com',
                    'recipient_name': 'Candidate One',
                    'subject': 'Interview update',
                    'body': 'Hello Candidate One',
                    'html_body': '<p>Hello</p>',
                },
                {
                    'recipient_email': 'SAME@example.com',
                    'recipient_name': 'Candidate Two',
                    'subject': 'Interview update',
                    'body': 'Hello Candidate Two',
                    'html_body': '<p>Hello</p>',
                },
            ])

        self.assertTrue(result['success'])
        self.assertEqual(smtp_client.sendmail.call_count, 1)
        smtp_client.sendmail.assert_called_once_with('noreply@example.com', ['same@example.com'], ANY)


if __name__ == '__main__':
    unittest.main()
