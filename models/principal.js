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
        notes: DataTypes.TEXT,
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Καθορίζει αν μπορεί να πραγματοποιήσει είσοδο στην Εφαρμογή με το email του',
        },
    },
    {
        tableName: 'principals',
        timestamps: true,
        indexes: [
            { 
                fields: ['email'],
                unique: true,
                name: 'principals_email',
                where: {
                    email: { [db.Sequelize.Op.ne]: null }
                }
            }
        ],
    }
);

export { Principal };