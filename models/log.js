import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 


const Log = db.define('log',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        type: DataTypes.STRING, // e.g., "email", "login", "error", "submission"
        severity: DataTypes.STRING, // e.g., "info", "warning", "error"
        body: DataTypes.JSONB,
    },
    {
        tableName: 'logs',
        timestamps: true,
        updatedAt: false,
        createdAt: 'createdAt',
        indexes: [
            {
                name: 'idx_logs_type_created',
                fields: ['type', 'createdAt']
            }
            // Αρκετά αλλά όχι πλήρως αποδοτικό για queries με φίλτρο το body
            // Ίσως χρειαστεί κάποιο σύνθετο index στο μέλλον (για το path '/:periodId/logs')
        ]
    }

);



export { Log };