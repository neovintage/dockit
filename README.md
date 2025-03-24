# Dockit

The human way to manage, backup, and track all of your import documents.

## Use Cases

- **Document Management**: Dockit simplifies the process of organizing and storing documents, ensuring they are easily accessible when needed.
- **Backup and Recovery**: With Dockit, you can create backups of your documents and restore them quickly in case of data loss or corruption.
- **Tracking Changes**: Dockit allows you to track changes made to documents over time, providing a history of updates and revisions.

## Development

### Requirements

- Node.js version 22 or higher
- npm version 6 or higher
- python 3.10 or higher
- make

### Building the Project

To build the project, run the following command:

```bash
git clone https://github.com/neovintage/dockit.git
cd dockit
npm install
npm run build
npx nexe dist/dockit.js -o dockit --build
```

## Using Dockit

Assuming you've already built the project or installed it in your system, you can run Dockit by executing the following command:

```bash
$ dockit --help
```
