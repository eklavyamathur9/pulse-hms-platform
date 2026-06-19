import logging

from config import Config

logger = logging.getLogger(__name__)


def create_payment_intent(amount_cents: int, currency: str = "usd", metadata: dict = None) -> dict:
    stripe_secret_key = Config.STRIPE_SECRET_KEY
    if not stripe_secret_key:
        logger.info("Stripe not configured — returning mock payment intent")
        return {
            "id": f"pi_mock_{amount_cents}",
            "client_secret": f"cs_mock_{amount_cents}",
            "amount": amount_cents,
            "currency": currency,
            "status": "requires_payment_method",
        }

    try:
        import stripe

        stripe.api_key = stripe_secret_key

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
        )
        logger.info("Stripe PaymentIntent created: %s", intent.id)
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }
    except Exception as e:
        logger.error("Stripe PaymentIntent failed: %s", e)
        return {"error": str(e)}


def confirm_payment(payment_intent_id: str) -> dict:
    stripe_secret_key = Config.STRIPE_SECRET_KEY
    if not stripe_secret_key:
        return {"id": payment_intent_id, "status": "succeeded"}

    try:
        import stripe

        stripe.api_key = stripe_secret_key

        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "id": intent.id,
            "status": intent.status,
            "amount": intent.amount,
            "currency": intent.currency,
        }
    except Exception as e:
        logger.error("Stripe retrieve failed: %s", e)
        return {"error": str(e)}
