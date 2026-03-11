"""
Utilities for PDF generation and email sending via Brevo
"""
from io import BytesIO
from datetime import datetime
from typing import Dict, List
import asyncio
import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

# Initialize Brevo
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@checkadmin.app")
SENDER_NAME = os.environ.get("SENDER_NAME", "CheckAdmin")

def generate_invoice_html(sale_data: Dict, items: List[Dict]) -> str:
    """Generate invoice HTML"""
    company_name = "Farmacéutica Demo S.A."
    invoice_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{item['product_name']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item['quantity']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item['price']:,.0f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item['subtotal']:,.0f}</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; }}
            .container {{ max-width: 800px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }}
            .header {{ border-bottom: 3px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }}
            .company-name {{ color: #4F46E5; font-size: 28px; font-weight: bold; margin: 0; }}
            .invoice-title {{ color: #1f2937; font-size: 24px; margin-top: 10px; }}
            .info-section {{ margin: 20px 0; }}
            .info-label {{ color: #6b7280; font-size: 14px; margin-bottom: 5px; }}
            .info-value {{ color: #1f2937; font-size: 16px; font-weight: 600; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th {{ background-color: #f9fafb; padding: 12px; text-align: left; color: #6b7280; font-size: 14px; border-bottom: 2px solid #e5e7eb; }}
            .total-row {{ background-color: #f9fafb; font-weight: bold; font-size: 18px; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="company-name">{company_name}</h1>
                <h2 class="invoice-title">Factura Electrónica</h2>
            </div>
            
            <div class="info-section">
                <div class="info-label">Número de Factura</div>
                <div class="info-value">#{sale_data['id'][:8].upper()}</div>
            </div>
            
            <div class="info-section">
                <div class="info-label">Fecha y Hora</div>
                <div class="info-value">{invoice_date}</div>
            </div>
            
            <div class="info-section">
                <div class="info-label">Cliente</div>
                <div class="info-value">{sale_data.get('customer_email', 'Cliente General')}</div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th style="text-align: center;">Cantidad</th>
                        <th style="text-align: right;">Precio Unit.</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="3" style="padding: 20px; text-align: right;">TOTAL:</td>
                        <td style="padding: 20px; text-align: right; color: #4F46E5;">${sale_data['total']:,.0f}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="margin: 0; color: #047857; font-weight: 600;">Método de Pago: {sale_data.get('payment_method', 'Efectivo').upper()}</p>
                {f'<p style="margin: 5px 0 0 0; color: #047857;">Pagó con: ${sale_data.get("amount_paid", 0):,.0f}</p>' if sale_data.get('amount_paid') else ''}
                {f'<p style="margin: 5px 0 0 0; color: #047857;">Cambio: ${sale_data.get("change", 0):,.0f}</p>' if sale_data.get('change') else ''}
            </div>
            
            <div class="footer">
                <p>CheckAdmin - Sistema ERP Industrial</p>
                <p>Gracias por su compra</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def generate_payroll_html(liquidation_data: Dict, employee_data: Dict) -> str:
    """Generate payroll receipt HTML"""
    company_name = "Farmacéutica Demo S.A."
    liquidation_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; }}
            .container {{ max-width: 800px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }}
            .header {{ border-bottom: 3px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }}
            .company-name {{ color: #4F46E5; font-size: 28px; font-weight: bold; margin: 0; }}
            .doc-title {{ color: #1f2937; font-size: 24px; margin-top: 10px; }}
            .section {{ margin: 25px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; }}
            .section-title {{ color: #4F46E5; font-size: 18px; font-weight: bold; margin-bottom: 15px; }}
            .row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
            .label {{ color: #6b7280; font-size: 14px; }}
            .value {{ color: #1f2937; font-size: 16px; font-weight: 600; }}
            .total-section {{ background-color: #eff6ff; border: 2px solid #4F46E5; margin-top: 20px; }}
            .total-value {{ color: #4F46E5; font-size: 24px; font-weight: bold; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
            .deduction {{ color: #dc2626; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="company-name">{company_name}</h1>
                <h2 class="doc-title">Comprobante de Nómina</h2>
            </div>
            
            <div class="section">
                <div class="section-title">Información del Empleado</div>
                <div class="row">
                    <span class="label">Nombre:</span>
                    <span class="value">{employee_data['name']}</span>
                </div>
                <div class="row">
                    <span class="label">Documento:</span>
                    <span class="value">{employee_data['document']}</span>
                </div>
                <div class="row">
                    <span class="label">Email:</span>
                    <span class="value">{employee_data.get('email', 'N/A')}</span>
                </div>
                <div class="row">
                    <span class="label">Fecha de Liquidación:</span>
                    <span class="value">{liquidation_date}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Devengado</div>
                <div class="row">
                    <span class="label">Días Trabajados:</span>
                    <span class="value">{liquidation_data['days_worked']}</span>
                </div>
                <div class="row">
                    <span class="label">Valor Día:</span>
                    <span class="value">${liquidation_data['daily_rate']:,.0f}</span>
                </div>
                <div class="row">
                    <span class="label">Salario Base:</span>
                    <span class="value">${liquidation_data['base_salary']:,.0f}</span>
                </div>
                <div class="row">
                    <span class="label">Subsidio de Transporte:</span>
                    <span class="value">${liquidation_data['transport_subsidy']:,.0f}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Deducciones</div>
                <div class="row">
                    <span class="label deduction">Salud (4%):</span>
                    <span class="value deduction">-${liquidation_data.get('health_deduction', 0):,.0f}</span>
                </div>
                <div class="row">
                    <span class="label deduction">Pensión (4%):</span>
                    <span class="value deduction">-${liquidation_data.get('pension_deduction', 0):,.0f}</span>
                </div>
                <div class="row">
                    <span class="label deduction">ARL (0.522%):</span>
                    <span class="value deduction">-${liquidation_data.get('arl_deduction', 0):,.0f}</span>
                </div>
            </div>
            
            <div class="section total-section">
                <div class="row" style="border: none;">
                    <span class="section-title" style="margin: 0;">Total a Pagar:</span>
                    <span class="total-value">${liquidation_data['net_salary']:,.0f}</span>
                </div>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">Información Confidencial</p>
                <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">Este documento es personal y confidencial. Guárdelo para sus registros.</p>
            </div>
            
            <div class="footer">
                <p>CheckAdmin - Sistema ERP Industrial</p>
                <p>Este es un documento generado automáticamente</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

async def send_email_async(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using Brevo (async)"""
    if not BREVO_API_KEY:
        print("Brevo API key not configured")
        return False
    
    try:
        # Configure Brevo
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = BREVO_API_KEY
        
        # Create API instance
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        # Create email
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            to=[{"email": to_email}],
            subject=subject,
            html_content=html_content
        )
        
        # Send email in thread to keep FastAPI non-blocking
        await asyncio.to_thread(api_instance.send_transac_email, send_smtp_email)
        print(f"Email sent successfully to {to_email}")
        return True
    except ApiException as e:
        print(f"Failed to send email via Brevo: {e}")
        return False
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False
