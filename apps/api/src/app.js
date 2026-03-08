const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { clientUrl } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
require('./models/Exercise');
require('./models/Program');
require('./models/WorkoutLog');
require('./models/User');
require('./models/Goal');
require('./models/NutritionLog');
require('./models/HydrationLog');
require('./models/Subscription');
require('./models/Session');
require('./models/Post');
require('./models/MorphologyAnalysis');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const programRoutes = require('./routes/programRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const goalRoutes = require('./routes/goalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const billingRoutes = require('./routes/billingRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const socialRoutes = require('./routes/socialRoutes');
const privacyRoutes = require('./routes/privacyRoutes');
const morphologyRoutes = require('./routes/morphologyRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: clientUrl === '*' ? true : clientUrl }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', socialRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/morphology', morphologyRoutes);

app.use(errorHandler);

module.exports = app;
