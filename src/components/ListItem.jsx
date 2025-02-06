import React from 'react';

const ListItem = ({ item, index }) => {
    return (
        <li key={index} className="flex">
            <span className="mr-4">{item.logo}</span>
            <div>
                <h3 className="font-semibold">
                    {item.href ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                            {item.name}
                        </a>
                    ) : (
                        item.name
                    )}
                    {item.isCurrent && (
                        <span className="bg-yellow-200 text-yellow-800 text-xs font-semibold m-2 px-2.5 py-0.5 rounded">
                            CURRENT
                        </span>
                    )}
                </h3>
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-gray-500">{item.date}</p>
            </div>
        </li>
    );
};

export default ListItem; 