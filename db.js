const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { STRING } = Sequelize;
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

User.byToken = async(token)=> {
  try {
    const payload =  jwt.verify(token, process.env.JWT);
    console.log("payload", payload)
    const user = await User.findByPk(payload.id)
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    console.log("payload", payload);
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
})

User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username,
    }
  });
  if(user && await bcrypt.compare(password, user.password)){
    return jwt.sign({ id: user.id }, process.env.JWT);

  }
  const error = Error('bad credentials');
  console.log(await bcrypt.hash(password, 10));
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );
  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};


module.exports = {
  syncAndSeed,
  models: {
    User
  }
};
