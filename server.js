const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');

const app = express();

 //Configuracion de la base de datos Oracle
 const dbConfig = {
    user: 'sekunet_admin',
    password: '12345',
    connectString: 'localhost:1521/orcl'
};

//Configuracion de la sesion
const secret = crypto.randomBytes(32).toString('hex');

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false}
}));

//Funcion para obtener una conexion de base de datos
async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log('Conexion a Oracle establecida');
        return connection;
    } catch (err) {
        console.error('Error al conectar a Oracle:', err);
        throw err;
    }
}

//Middleware para hacer disponible la conexion a las rutas
app.use(async (req, res, next) => {
    try {
        req.db = await getConnection();
        console.log('Conexión a la base de datos establecida en middleware');
        next();
    } catch (err) {
        console.error('Error en el middleware de conexión:', err);
        res.status(500).send('Error en la conexión a la base de datos');
    }
});

app.use(express.static(path.join(__dirname, 'styles')));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Middleware para manejar el estado de autentificacion
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    next();
});

//Rutas
app.get('/', (req, res) => {
    const rol = req.session.rol;
    res.render('index', { rol });
});

//Ruta para manejar el inicio de sesion
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = req.db;

        // Verificar si el usuario existe y si las credenciales son correctas
        const result = await connection.execute(
            'SELECT * FROM fide_usuarios_tb WHERE usuario_email = :email AND usuario_contrasena = :password',
            [email, password]
        );

        if (result.rows.length > 0) {
            // Credenciales correctas, redirigir a index.ejs
            req.session.isAuthenticated = true;
            req.session.userId = result.rows[0][0];
            req.session.userEmail = email;
            req.session.rol = 'admin'; // Establecer rol aquí
            return res.redirect('/'); // Asegúrate de usar return para evitar múltiples respuestas
        } else {
            // Credenciales incorrectas, redirigir a login.ejs
            return res.redirect('/login'); // Asegúrate de usar return para evitar múltiples respuestas
        }
    } catch (err) {
        console.log('Error al iniciar sesión:', err);
        res.status(500).send('Error al iniciar sesión');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('Error al cerrar sesión:', err);
        }
        res.redirect('/');
    });
});


//Ruta para manejar la creacion de una cuenta
app.get('/crear-cuenta', (req, res) => {
    res.render('crear-cuenta');
});

app.post('/crear-cuenta', async (req, res) => {
    const { username, apellido, email, password } = req.body;

    try{
        const connection = req.db;

        //Determina el rol en base al handle del correo
        let rol_id;
        if (email.includes('@sekunet')){
            rol_id = 1; //ID para admin
        } else if (email.includes('@vendedor')){
            rol_id = 3; //ID para seller
        } else {
            rol_id = 2; //ID para cliente
        }

        //Inserta los datos en la tabla fide_usuarios_tb
        const result = await connection.execute(
            `INSERT INTO fide_usuarios_tb (usuario_id, usuario_nombre, usuario_apellido, usuario_email, usuario_contrasena, rol_id)
            VALUES (fide_usuarios_seq.NEXTVAL, :username, :apellido, :email, :password, :rol_id)`,
            [username, apellido, email, password, rol_id],
            { autoCommit: true }
        );

        console.log('Usuario creado exitosamente: ', result);
        res.redirect('/login');
    } catch (err) {
        console.log('Error al crear el usuario: ', err);
        res.status(500).send('Error al crear el usuario');
    }
});

app.get('/routers', (req, res) => {
    res.render('routers');
});

app.get('/switches', (req, res) => {
    res.render('switches');
});

app.get('/productos-domotica', (req, res) => {
    res.render('productos-domotica');
});

app.get('/recuperar-password', (req, res) => {
    res.render('recuperar-password');
});

app.get('/ver-producto', (req, res) => {
    res.render('ver-producto');
});

// Ruta para mostrar el perfil
app.get('/perfil', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }

    try {
        const connection = req.db;
        const email = req.session.userEmail;

        // Consultar la información del usuario desde la base de datos
        const userResult = await connection.execute(
            'SELECT usuario_id, usuario_nombre, usuario_email, usuario_contrasena, usuario_fecha_registro, rol_id FROM fide_usuarios_tb WHERE usuario_email = :email',
            [email]
        );

        const user = userResult.rows[0];
        if (!user){
            return res.status(404).send('Usuario no encontrado');
        }

        // Obtener el nombre del rol
        const roleResult = await connection.execute(
            'SELECT rol_nombre FROM fide_roles_tb WHERE rol_id = :rol_id',
            [user[5]]
        );

        const role = roleResult.rows[0][0];

        // Consultar el número de tarjeta del usuario
        const cardResult = await connection.execute(
            'SELECT metodo_tipo FROM fide_metodos_pago_tb WHERE usuario_id = :userId ORDER BY metodo_pago_id DESC FETCH FIRST 1 ROW ONLY',
            [user[0]]
        );

        let cardInfo = 'No se encontró información de tarjeta';
        if (cardResult.rows.length > 0){
            const fullCardInfo = cardResult.rows[0][0];
            const cardNumber = fullCardInfo.match(/\d+/);
            cardInfo = cardNumber ? cardNumber[0] : 'Número de tarjeta no disponible';
        }

        // Consultar el estado de notificaciones
        const notifResult = await connection.execute(
            'SELECT notificacion_id FROM fide_notificaciones_tb WHERE usuario_id = :userId',
            [user[0]]
        );

        const notificacionesChecked = notifResult.rows.length > 0 ? 'checked' : '';

        res.render('perfil', {
            nombre: user[1],
            email: user[2],
            contrasena: user[3],
            fechaRegistro: user[4],
            rol: role,
            tarjeta: cardInfo,
            notificacionesChecked: notificacionesChecked
        });
    } catch (err) {
        console.error('Error al obtener el perfil:', err);
        res.status(500).send('Error al obtener el perfil');
    }
});

// Ruta para guardar el estado de notificaciones
app.post('/guardar-notificaciones', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;
    const notificaciones = req.body.notificaciones ? true : false;

    try {
        const connection = req.db;

        if (notificaciones) {
            // Inserta en la tabla si no existe una entrada
            await connection.execute(
                `MERGE INTO fide_notificaciones_tb USING (SELECT :userId AS usuario_id FROM dual) src
                 ON (fide_notificaciones_tb.usuario_id = src.usuario_id)
                 WHEN NOT MATCHED THEN
                 INSERT (notificacion_id, usuario_id, notificacion_tipo, notificacion_contenido)
                 VALUES (fide_notificaciones_seq.NEXTVAL, :userId, 'General', 'Notificaciones activas')`,
                [userId],
                { autoCommit: true }
            );
        } else {
            // Elimina la entrada si existe
            await connection.execute(
                `DELETE FROM fide_notificaciones_tb WHERE usuario_id = :userId`,
                [userId],
                { autoCommit: true }
            );
        }

        res.redirect('/perfil');
    } catch (err) {
        console.error('Error al guardar el estado de las notificaciones:', err);
        res.status(500).send('Error al guardar el estado de las notificaciones');
    }
});

//Rutas para agregar productos
app.get('/agregar-producto', async (req, res) => {
    try {
        const connection = req.db;

        // Obtener las categorías desde la base de datos
        const categoriasResult = await connection.execute(
            'SELECT categoria_id, categoria_nombre FROM fide_categorias_tb'
        );

        const categorias = categoriasResult.rows.map(row => ({
            categoria_id: row[0],
            categoria_nombre: row[1]
        }));

        res.render('agregar-producto', { categorias });
    } catch (err) {
        console.log('Error al obtener categorías', err);
        res.status(500).send('Error al obtener categorías');
    }
});

//Ruta para guardar el producto
app.post('/guardar-producto', async (req, res) => {
    const { nombre, descripcion, precio, categoria, cantidad } = req.body;

    const nuevosProducto = {
        nombre,
        descripcion,
        precio,
        categoria,
        cantidad
    };

    const productos = leerProductos();
    productos.push(nuevosProducto);
    escribirProductos(productos);

    console.log('Producto agregado exitosamente:', nuevosProducto);
    res.redirect('/');
});

app.get('/metodo-pago', (req, res) => {
    res.render('metodo-pago');
});

app.get('/sucursales', (req, res) => {
    res.render('sucursales');
});

app.get('/editar-producto', (req, res) => {
    res.render('editar-producto');
});

app.post('/guardar-pago', async (req, res) => {
    const {
        'metodo-tipo': metodoTipo,
        'numero-tarjeta': numeroTarjeta,
        'fecha-expiracion': expiryDate,
        'cvv': cvv,
        'estado': estado
    } = req.body;

    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    console.log('Datos recibidos:', {
        metodoTipo,
        numeroTarjeta,
        expiryDate,
        cvv,
        estado
    });

    try {
        const connection = req.db;

        // Inserta los datos en la tabla fide_metodos_pago_tb
        const result = await connection.execute(
            `INSERT INTO fide_metodos_pago_tb (metodo_pago_id, usuario_id, metodo_tipo, numero_tarjeta, fecha_expiracion, cvv, estado)
            VALUES (fide_metodos_pago_seq.NEXTVAL, :userId, :metodoTipo, :numeroTarjeta, TO_DATE(:expiryDate, 'YYYY-MM'), :cvv, :estado)`,
            [userId, metodoTipo, numeroTarjeta, expiryDate, cvv, estado],
            { autoCommit: true }
        );

        console.log('Método de pago guardado exitosamente: ', result);
        res.redirect('/perfil');
    } catch (err) {
        console.log('Error al guardar el método de pago: ', err);
        res.status(500).send('Error al guardar el método de pago');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});