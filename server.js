const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'styles')));

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    console.log('Here')
    res.render('index')
});
 
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})