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

export const generateOwnerCredentialsEmail = (name: string, email: string, password: string, isReset: boolean = false) => {
    const title = isReset ? 'Restablecimiento de Contraseña' : 'Bienvenido al Portal de Propietarios'
    const subjectPrefix = isReset ? 'Nueva Contraseña' : 'Credenciales de Acceso'

    // Custom logic to show "Your account has been created" vs "Your password has been reset"
    const content = isReset
        ? `
        <p>Hola <strong>${name}</strong>,</p>
        <p>Su contraseña para acceder al Portal de Propietarios ha sido actualizada exitosamente.</p>
        <p>A continuación encontrará sus nuevas credenciales de acceso:</p>
        <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; font-family: monospace;">Usuario: <strong>${email}</strong></p>
            <p style="margin: 8px 0 0 0; font-family: monospace;">Contraseña: <strong>${password}</strong></p>
        </div>
        <p>Le recomendamos cambiar esta contraseña una vez ingrese al sistema.</p>
        <p>Puede acceder al portal en cualquier momento haciendo clic en el siguiente enlace:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/owners/login" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px;">Ir al Portal</a>
        `
        : `
        <p>Hola <strong>${name}</strong>,</p>
        <p>Le damos la bienvenida al <strong>Portal de Propietarios</strong>.</p>
        <p>Se ha creado una cuenta para que pueda acceder al Portal de Propietarios, donde podrá visualizar el estado de sus propiedades, contratos y pagos.</p>
        <p>Sus credenciales de acceso son:</p>
        <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; font-family: monospace;">Usuario: <strong>${email}</strong></p>
            <p style="margin: 8px 0 0 0; font-family: monospace;">Contraseña: <strong>${password}</strong></p>
        </div>
        <p>Puede acceder al portal haciendo clic en el siguiente botón:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/owners/login" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px;">Acceder al Portal</a>
        `

    return generateEmailHtml(title, content, name) // We are abusing the 'message' param slightly by passing HTML, but our generateEmailHtml needs adjustment to allow HTML or we just wrap it.
    // Wait, generateEmailHtml iterates lines. That might break my HTML block.
    // I should create a new standalone template function to be safe and clean.
}

// Standalone template for credentials to avoid line-splitting issues in the generic one
export const generateOwnerCredentialsTemplate = (name: string, email: string, password: string, isReset: boolean = false) => {
    const title = isReset ? 'Restablecimiento de Contraseña' : 'Bienvenido al Portal de Propietarios'
    const intro = isReset
        ? 'Su contraseña ha sido actualizada. A continuación sus nuevas credenciales:'
        : 'Se ha creado su cuenta de acceso. A continuación sus credenciales:'

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; line-height: 1.5; color: #18181b; }
        .container { max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #18181b; color: #ffffff; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
        .content { padding: 40px 32px; }
        .credentials { background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 24px; margin: 24px 0; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 600; margin-bottom: 4px; }
        .value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 16px; color: #18181b; font-weight: 500; }
        .footer { background-color: #fafafa; padding: 24px; text-align: center; font-size: 13px; color: #71717a; border-top: 1px solid #e4e4e7; }
        .button { display: inline-block; background-color: #18181b; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px; }
        .button:hover { background-color: #27272a; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Escritorio Legal</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0; font-size: 20px; font-weight: 600;">${title}</h2>
            <p>Hola ${name},</p>
            <p>${intro}</p>
            
            <div class="credentials">
                <div style="margin-bottom: 16px;">
                    <div class="label">Usuario / Email</div>
                    <div class="value">${email}</div>
                </div>
                <div>
                    <div class="label">Contraseña</div>
                    <div class="value">${password}</div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/owners/login" class="button">Acceder al Portal</a>
            </div>
            
            <p style="font-size: 14px; margin-top: 32px; color: #52525b;">Recomendamos cambiar su contraseña después de iniciar sesión por primera vez.</p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático. Por favor no responder.</p>
        </div>
    </div>
</body>
</html>
    `
};
