# MÉTODO MANUAL - Configuración de Base de Datos

Si el script automático falla (por contraseñas con caracteres especiales), usa este método:

## Opción 1: MySQL Workbench (Recomendado)

1. Abre **MySQL Workbench**
2. Conecta a tu servidor local
3. Abre el archivo `schema.sql` (File > Open SQL Script)
4. Ejecuta el script (⚡ botón Execute)
5. Abre el archivo `seeders.sql`
6. Ejecuta el script (⚡ botón Execute)
7. ¡Listo!

---

## Opción 2: Línea de comandos

Abre una terminal PowerShell en la carpeta `database/`:

```powershell
# 1. Conectar a MySQL (te pedirá la contraseña)
mysql -u root -p

# 2. Dentro de MySQL, ejecuta estos comandos uno por uno:
CREATE DATABASE pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pepsico_fleet;
SOURCE schema.sql;
SOURCE seeders.sql;
EXIT;
```

---

## Opción 3: Script PowerShell (Maneja contraseñas especiales)

```powershell
# Ejecuta desde PowerShell (en la carpeta database):
.\setup-database.ps1
```

Este script maneja mejor las contraseñas con caracteres especiales.

---

## Verificar que funcionó

Conéctate a MySQL y verifica:

```sql
mysql -u root -p
USE pepsico_fleet;
SHOW TABLES;
SELECT * FROM usuarios;
```

Deberías ver 7 tablas y 5 usuarios.

---

## Solución de Problemas

### Error: "Access denied"
- Verifica que tu usuario sea `root`
- Verifica tu contraseña de MySQL
- Intenta con el método de MySQL Workbench

### Error: "Unknown database"
- Ejecuta primero: `CREATE DATABASE pepsico_fleet;`
- Luego los scripts

### Error: "Cannot find schema.sql"
- Asegúrate de estar en la carpeta `database/`
- Usa rutas absolutas si es necesario:
  ```
  SOURCE C:/Users/tu-usuario/Desktop/PepsicoApp/database/schema.sql;
  ```
