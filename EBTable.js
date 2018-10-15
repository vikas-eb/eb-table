import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { LinearProgress, 
    TablePagination,
    ButtonBase, 
    withStyles, 
    Paper, 
    Table, 
    TableBody, 
    TableRow, 
    TableCell, 
    TableHead, 
    Tooltip, 
    TableSortLabel, 
    Checkbox,
    TableFooter,
    Divider} from '@material-ui/core';
import * as tableTypes from '../../../actionTypes/tableTypes';
import { config } from '../../../util/config';
import { fetchData } from '../../../actions/tableActions';
import { constants } from '../../../util/constants';
import FormattedTextbox from '../FormattedTextbox';
import AutoComplete from '../Autocomplete';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import uuid from 'uuid/v4';

const styles = () => ({
    root: {
        flexGrow: 1,
        height: '25px',
        fontSize: '10px',

        tableCell: {
            fontSize: '10px !important'
        },

        paginate: {
            textAlign: 'right !important'
        },

    },
    // https://github.com/mui-org/material-ui/issues/1911#issuecomment-411748727
    narrowCell: {
        width: '450px !important', 
    }
    
});

/**
 * The EB Table will have these features:
 * 1. Sorting
 * 2. Filtering
 * 3. Binding columns
 * 
 * Columns should be sent like below example
 * 
 * [
 *  {
 *      name: 'Id',
 *      type: 'number/string/currency/date'
 *  },
 *  {
 *      name: 'Name',
 *      type: 'string'
 *  }
 * ]
 * 
 * Password: Literal { val: 'BINARY Password = \'@Shiv17291\'' },
  Active: 1,
  CreatedAt: { [Symbol(gte)]: '1/1/2018' }
 */


    
class EBTable extends React.Component {

    fetch(pageIndex, rowsToReturn, order, where) {
        const post = {
            pageIndex,
            rowsToReturn,
            order,
            where
        };

        this.props.fetchData(`${constants.API_URL}${this.props.url}`, post);
    }

    constructor(props) {
        super(props);

        this.state = {
            pageIndex: 0,
            showLoader: false,
            orderBy: 'Id',
            orderDirection: 'asc',
            where: [],
            include: [],
            rowsToReturn: config.DEFAULT_ROWS_LIST,
            allRecordsSelected: false
        };

        this.fetch(this.state.pageIndex, this.state.rowsToReturn,
        [[this.state.orderBy, this.state.orderDirection]],
            this.state.where);
    }


    onHeaderClicked = columnName => event => {
        const orderDirection = columnName === this.state.orderBy ? ( this.state.orderDirection === 'asc' ? 'desc' : 'asc' ) : 'asc';

        this.setState({
            orderBy: columnName,
            orderDirection
        });

        this.fetch(this.state.pageIndex, this.state.rowsToReturn,
            [[columnName, orderDirection]],
            this.state.where);
    };


    paginate = step => event => {

        let pageIndex = this.state.pageIndex;

        switch(step) {
            case 'start':
                pageIndex = 0;
                break;
            case 'last':
                pageIndex = Math.floor(this.props.recordsCount / this.state.rowsToReturn);
                if (this.props.recordsCount % this.state.rowsToReturn === 0) {
                    pageIndex --;
                }
                break;
            case 'previous':
                pageIndex = pageIndex - 1;
                break;
            case 'next':
                pageIndex = pageIndex + 1;
                break;
        }

        this.fetch(pageIndex, this.state.rowsToReturn,
            [[this.state.orderBy, this.state.orderDirection]],
            this.state.where);

        this.setState({ pageIndex });
    };


    handleChangeRowsPerPage = (rows, name, index) => {
        this.fetch(this.state.pageIndex, rows,
            [[this.state.orderBy, this.state.orderDirection]],
            this.state.where);
        this.setState({ rowsToReturn: rows });
    };


    openEditWindow = id => event => {
        alert('WIP');
    };


    selectAll = event => {
        this.setState({ allRecordsSelected: true })
    };


    onRecordSelected = id => event => {
        if (!event.target.checked) {
            this.setState({ allRecordsSelected: false });
        }
        else {
            let atleastOneRowNotSelected = false;
            this.props.data.forEach(item => {

                if (item.Id === id)
                    item.ebRecordChecked = true;

                if (!(item.ebRecordChecked)) {
                    atleastOneRowNotSelected = true;
                }
            });

            this.setState({ allRecordsSelected: !atleastOneRowNotSelected });
        }

        this.onRowSelected(id)(event);
    };


    onRowSelected = id => event => {
        this.setState({ selectedId: id });

        if (this.props.onRowSelected) {
            this.props.onRowSelected(id);
        }
    };


    printTable = () => {
        this.setState({ showLoader: true });
        const that = this;
        html2canvas(document.getElementById('tblData_'+this.props.id), {scale: 1}).then(function(canvas) {


            var imgData = canvas.toDataURL('image/png');

            /*
            Here are the numbers (paper width and height) that I found to work. 
            It still creates a little overlap part between the pages, but good enough for me.
            if you can find an official number from jsPDF, use them.
            */
            var imgWidth = 210; 
            var pageHeight = 295;  
            var imgHeight = canvas.height * imgWidth / canvas.width;
            var heightLeft = imgHeight;

            var doc = new jsPDF('p', 'mm');
            var position = 0;

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save('print' + uuid() + '.pdf');
        });        
    }

   
    render() {
        const { classes, columns, recordsCount, error, data, type, message, textColor } = this.props;
        const lowerRange = (this.state.pageIndex * this.state.rowsToReturn) + 1;
        let upperRange = (this.state.pageIndex + 1) * this.state.rowsToReturn;

        const color = type === tableTypes.EB_TABLE_DATA_REQUESTED ? 'lightgray' : (textColor ? textColor : '#000000');

        if (upperRange > recordsCount) {
            upperRange = recordsCount;
        };

        if (error) {
            console.warn('(EBTable) => Error received: ', error);
            if(this.props.onErrorReceived){
                this.props.onErrorReceived(error);
            }
        }


        /**
         * writing my own pagination because there are lot of tacky formatting issues with the existing tablepagination in material ui
         */
        const Pagination = () => {
            return (
                <div className='links small-font sane-margin-from-top align-right sane-margin-from-bottom'>
                    Rows per page: 
                    <AutoComplete
                        textStyle={{fontSize: '10px', textAlign: 'center'}}
                        data={[
                            {Id: 5, Name:'5'},
                            {Id: 10, Name:'10'},
                            {Id: 15, Name:'15'},
                            {Id: 20, Name:'20'},
                            {Id: 25, Name:'25'},
                            {Id: 50, Name:'50'},
                            {Id: 75, Name:'75'},
                            {Id: 100, Name:'100'},
                            {Id: 200, Name:'200'},
                            {Id: 500, Name:'500'},
                            {Id: 1000, Name:'1000'},
                            {Id: 5000, Name:'5000'},
                        ]}
                        selectedText={this.state.rowsToReturn}
                        className='same-row sane-margin-from-right sane-margin-from-left'
                        style={{ width: '30px'}}
                        onItemSelected={this.handleChangeRowsPerPage}
                    ></AutoComplete>
                    <ButtonBase className='same-row' disabled={this.state.pageIndex === 0}>
                        <i disabled={this.state.pageIndex === 0} 
                            onClick={this.paginate('start')}
                            style={{color: this.state.pageIndex === 0 ? 'LightGray' : 'Gray'}}
                            className='material-icons'>skip_previous</i>
                    </ButtonBase>
                    <ButtonBase disabled={this.state.pageIndex === 0}>
                        <i disabled={this.state.pageIndex === 0} 
                            onClick={this.paginate('previous')}
                            style={{color: this.state.pageIndex === 0 ? 'LightGray' : 'Gray'}}
                            className='material-icons'>keyboard_arrow_left</i>
                    </ButtonBase>
                    showing {lowerRange} - {upperRange} of {recordsCount} records 
                    <ButtonBase>
                        <i 
                            onClick={this.paginate('next')}
                            style={{color: upperRange === recordsCount ? 'LightGray' : 'Gray'}}
                            className='material-icons'>keyboard_arrow_right</i>
                    </ButtonBase>
                    <ButtonBase className='big-margin-from-right'>
                        <i 
                            onClick={this.paginate('last')}
                            style={{color: upperRange === recordsCount ? 'LightGray' : 'Gray'}}
                        className='material-icons'>skip_next</i>
                    </ButtonBase>
                </div>
            )
        };

        return(
            <div style={{lineHeight: '30px'}}>
            <ButtonBase>
                <i className='material-icons' onClick={this.printTable}>print</i>
            </ButtonBase>
            <div style={{maxHeight: this.props.tableHeight ? this.props.tableHeight : '400px', overflow: 'scroll'}}>
            {(type === tableTypes.EB_TABLE_DATA_REQUESTED || this.state.showLoader) && <LinearProgress className='full-width' />}
                <Table id={'tblData_'+this.props.id} className='big-margin-from-bottom'> 
                    <TableHead align='right'>
                        <TableRow style={{background: '#fff'}}>
                            <TableCell style={{background: '#fff', position: 'sticky',  top: 0}} >
                                <Checkbox style={{background: '#fff'}} onChange={this.selectAll} checked={this.state.allRecordsSelected}></Checkbox>
                            </TableCell>
                            {columns && Array.isArray(columns) ? columns.map((column,index) => {
                                return ( <TableCell 
                                            className={[ classes.narrowCell, 'show-hand'].join(' ')}
                                            key={'head'+index}
                                            onClick={this.onHeaderClicked(column.name)}
                                            numeric={column.type === 'number'}
                                            style={{background: '#fff', position: 'sticky',  top: 0}}
                                         >
                                            <Tooltip
                                                title={'Sort by ' + column.name}
                                                placement={column.type === 'number' ? 'bottom-end' : 'bottom-start'}
                                                enterDelay={300}
                                                >
                                                <TableSortLabel
                                                    active={column.name === this.state.orderBy}
                                                    direction={this.state.orderDirection}
                                                >
                                                    {column.name}
                                                </TableSortLabel>
                                            </Tooltip>
                                        </TableCell>
                                    )
                            }) : ''}
                        </TableRow>
                    </TableHead>
                    <TableBody className={classes.root.tableCell} >
                        {data && Array.isArray(data) ? data.map(
                            item => {
                                return (
                                    <TableRow className={classes.root} hover={true} key={item.Id} onClick={this.onRowSelected(item.Id)} selected={this.state.selectedId === item.Id}>
                                        <TableCell>
                                            <Checkbox onChange={this.onRecordSelected(item.Id)} checked={item.ebRecordChecked} style={{height: '20px'}}></Checkbox>
                                        </TableCell>
                                        {
                                            columns.map((column, index) => {
                                                return <TableCell className={classes.narrowCell} style={{ color}} key={'column'+index} numeric={column.type === 'number'}>{column.name === 'Id' ? <a title={item[column.name]} className='links underline' onClick={this.openEditWindow(item[column.name])}>Edit</a> : item[column.name]}</TableCell>})}
                                    </TableRow>
                                )
                            }
                        ) : ''}
                    </TableBody>
                </Table>
                </div>

                <Divider></Divider>

                <Pagination></Pagination>
        </div>
        )
    }
}

EBTable.propTypes = {
    columns: PropTypes.array.isRequired,
    url: PropTypes.string,
    post: PropTypes.object,
    onErrorReceived: PropTypes.func,
    onRowSelected: PropTypes.func,
    textColor: PropTypes.string
};


const mapStateToProps = (state) => {
    const { type, error, data, message, recordsCount } = state.tableReducer;
    return { type, error, data, message, recordsCount };
};


const connectedComponent = withStyles(styles)(connect(mapStateToProps, { fetchData })(EBTable));
export { connectedComponent as EBTable };