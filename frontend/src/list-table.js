const React = require("react");
const autoBind = require("react-autobind");
const { withStyles } = require("@material-ui/core/styles");
const Table = require("@material-ui/core/Table").default;
const TableBody = require("@material-ui/core/TableBody").default;
const TableCell = require("@material-ui/core/TableCell").default;
const TableHead = require("@material-ui/core/TableHead").default;
const TableRow = require("@material-ui/core/TableRow").default;
const Paper = require("@material-ui/core/Paper").default;
const IconButton = require("@material-ui/core/IconButton").default;
const DeleteIcon = require("@material-ui/icons/Delete").default;

const styles = theme => ({
  root: {
    width: "100%",
    marginTop: theme.spacing.unit * 3,
    overflowX: "auto"
  }
});

class TableList extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  handleDeleteClick(id) {
    return ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this.props.onDeleteClick(id);
    };
  }
  render() {
    const { classes, noHeader, cells, data, onRowClick } = this.props;
    return (
      <Paper className={classes.root}>
        <Table className={classes.table}>
          {!noHeader && (
            <TableHead>
              <TableRow>
                {cells.map(({ name, key }, idx) => <TableCell key={key}>{name}</TableCell>)}
                <TableCell />
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {data.map(row => {
              return (
                <TableRow key={row.id} onClick={onRowClick(row.id)}>
                  {cells.map(({ name, key, accessor }, idx) => (
                    <TableCell key={key}>{accessor ? accessor(row) : row[key]}</TableCell>
                  ))}
                  <TableCell numeric>
                    <IconButton naria-label="Delete" onClick={this.handleDeleteClick(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  }
}

module.exports = withStyles(styles)(TableList);
