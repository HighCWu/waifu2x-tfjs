let React = require('react');

class Icon  extends React.Component{
    getStyle() {
        return {
            icons: {
                verticalAlign: 'middle'
            }
        }
    }
    render() {
        let style = this.getStyle();
        return (
            <i style={style.icons} className="material-icons">{this.props.iconType}</i>
        );
    }
};

module.exports = Icon;
