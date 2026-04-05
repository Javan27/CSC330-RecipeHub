from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
#This creates a local database file named recipes.db
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipes.db'
db = SQLAlchemy(app)

#Database Model
class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    servings = db.Column(db.String(10), default='4')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

#Create the database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')
@app.route('/login', methods = ['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()
        if user and user.password == password:
            return redirect('/')
        else:
            return "Invalid login"

    
    return render_template('login.html')
    
@app.route('/create_account', methods = ['GET','POST'])
def create_account():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        #checks for existing user
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return "Username already exists"

        #Confirms Passwords match
        if password != confirm_password:
            return "Passwords do not match"
        #Save User
        new_user = User(username=username, password=password)
        db.session.add(new_user)
        db.session.commit()
        return redirect('/login')
    return render_template('create_account.html')

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    recipes = Recipe.query.all()
    return jsonify([{'id': r.id, 'name': r.name, 'servings': r.servings} for r in recipes])

@app.route('/api/recipes', methods=['POST'])
def add_recipe():
    data = request.json
    new_recipe = Recipe(name=data['name'], servings=data['servings'])
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify({'id': new_recipe.id}), 201

if __name__ == '__main__':
    app.run(debug=True)
