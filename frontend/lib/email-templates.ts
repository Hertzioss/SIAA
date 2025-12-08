export const generateEmailHtml = (title: string, message: string, recipientName: string = 'Inquilino') => {
    // Basic clean modern template
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #000000; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
        .content { padding: 32px; color: #333333; line-height: 1.6; }
        .content p { margin-bottom: 16px; font-size: 16px; }
        .footer { background-color: #f4f4f5; padding: 24px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #e4e4e7; }
        .button { display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Escritorio Legal - Comunicado</h1>
        </div>
        <div class="content">
            <p>Hola <strong>${recipientName}</strong>,</p>
            
            ${message.split('\n').map(line => line ? `<p>${line}</p>` : '').join('')}
            
            <p style="margin-top: 32px; font-size: 14px; color: #666;">
                Atentamente,<br>
                El equipo de administración
            </p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático del Sistema Integral de Administración. Por favor no responder a este correo.</p>
            <p>&copy; ${new Date().getFullYear()} Escritorio Legal. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;
};
