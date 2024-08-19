const express = require('express');
const path = require('path');
const oracledb = require('oracledb');

const app = express();

 //Configuracion de la base de datos Oracle
const dbConfig = {
    user: 'sekunet_admin',
    password: '12345',
    connectString: 'localhost:1521/orcl'
};

//Funcion para obtener una conexion de base de datos
async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log('Conexion a Oracle establecida');
        return connection;
    } catch (err) {
        console.error('Error al conectar a Oracle:', err);
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


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));


//Rutas
app.get('/', (req, res) => {
    console.log('Updated')
    res.render('index')
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

app.get('/login', (req, res) => {
    res.render('login');
});

//Ruta para manejar el inicio de sesion
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = req.db;

        //Verificar si el usuario existe y si las credenciales son correctas
        const result = await connection.execute(
            'SELECT * FROM fide_usuarios_tb WHERE usuario_email = :email AND usuario_contrasena = :password',
            [email, password]
        );

        if (result.rows.length > 0){
            //Credenciales correctas, ridirigir a index.ejs
            res.redirect('/');
        } else {
            //Credenciales incorrectas, redirigir a login.ejs
            res.redirect('/login');
        }

    } catch (err) {
        console.log('Error al iniciar sesión:', err);
        res.status(500).send('Error al iniciar sesion');
    }
});

app.get('/crear-cuenta', (req, res) => {
    res.render('crear-cuenta');
});

//Ruta para manejar la creacion de una cuenta
app.post('/crear-cuenta', async (req, res) => {
    const { username, apellido, email, password } = req.body;

    try {
        const connection = req.db;

        //Determina el rol en base al handle del correo
        let rol_id = 2; //ID para cliente
        if (email.includes('@sekunet')){
            rol_id = 1; //ID para admin
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
        console.log('Error al crear el usuario:', err);
        res.status(500).send('Error al crear el usuario');
    }
});

app.get('/recuperar-password', (req, res) => {
    res.render('recuperar-password');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
})

app.get('/metodo-pago', (req, res) => {
    res.render('metodo-pago');
});

app.get('/sucursales', (req, res) => {
    res.render('sucursales');
});


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});