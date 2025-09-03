import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const User = db.define('user', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: DataTypes.STRING,
        username: DataTypes.STRING,
        name: DataTypes.STRING,
        password: DataTypes.STRING,
        role: DataTypes.STRING,
    },
    {
        tableName: 'users',
        timestamps: true
    }
);

export { User };