import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Party = db.define('party', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,
        afm: DataTypes.STRING,
        email: DataTypes.STRING,
        contact: DataTypes.STRING,
        contracts: DataTypes.JSON,
        // role: {
        //     type: DataTypes.STRING,
        //     defaultValue: 'tenant'
        // },
    },
    {
        tableName: 'parties',
        timestamps: true
    }
);

export { Party };