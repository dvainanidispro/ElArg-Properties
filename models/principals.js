import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Principal = db.define('principal', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: DataTypes.STRING,
        name: DataTypes.STRING,
        contact: DataTypes.STRING,
        role: {
            type: DataTypes.STRING,
            defaultValue: 'principal'
        },
    },
    {
        tableName: 'principals',
        timestamps: true
    }
);

export { Principal };