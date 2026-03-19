import React from 'react';

const ListItem = ({ item, index }) => {
    return (
        <li key={index} className="flex" style={{borderBottom: '1px dotted #ddd', paddingBottom: '1rem'}}>
            <span className="mr-4" style={{fontSize: '1.5rem'}}>{item.logo}</span>
            <div>
                <h3 style={{fontWeight: '400', marginBottom: '0.25rem'}}>
                    {item.href ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.name}
                        </a>
                    ) : (
                        <span style={{color: '#4169E1'}}>{item.name}</span>
                    )}
                    {item.isCurrent && (
                        <span style={{
                            backgroundColor: '#4169E1',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: '400',
                            marginLeft: '0.5rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '3px',
                            letterSpacing: '0.05em'
                        }}>
                            CURRENT
                        </span>
                    )}
                </h3>
                <p className="text-sm" style={{color: '#666', marginBottom: '0.25rem'}}>{item.description}</p>
                <p className="text-xs" style={{color: '#999'}}>{item.date}</p>
            </div>
        </li>
    );
};

export default ListItem; 