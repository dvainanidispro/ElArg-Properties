import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Principal = db.define('principal', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        name: DataTypes.STRING,
        contact: DataTypes.STRING,
        role: {
            type: DataTypes.STRING,
            defaultValue: 'principal'
        },
        active: DataTypes.BOOLEAN,
    },
    {
        tableName: 'principals',
        timestamps: true
    }
);

export { Principal };